package server

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
	"k8s.io/apiserver/pkg/server/dynamiccertificates"

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/record"
)

var slog = logrus.WithField("module", "server")

type Config struct {
	Port             int
	CertFile         string
	PrivateKeyFile   string
	Features         map[string]bool
	StaticPath       string
	ConfigPath       string
	PluginConfigPath string
	TLSMinVersion    uint16
	TLSCipherSuites  []uint16
}

func (c *Config) IsTLSEnabled() bool {
	return c.CertFile != "" && c.PrivateKeyFile != ""
}

func (c *Config) ValidateTLSConfig() error {
	if (c.CertFile == "") != (c.PrivateKeyFile == "") {
		return fmt.Errorf("both cert file and private key file must be set together")
	}
	return nil
}

type PluginServer struct {
	*http.Server
	Config *Config
	cancel context.CancelFunc
}

type PluginConfig struct {
	UseTenantInHeader               bool          `json:"useTenantInHeader,omitempty" yaml:"useTenantInHeader,omitempty"`
	IsStreamingEnabledInDefaultPage bool          `json:"isStreamingEnabledInDefaultPage,omitempty" yaml:"isStreamingEnabledInDefaultPage,omitempty"`
	AlertingRuleTenantLabelKey      string        `json:"alertingRuleTenantLabelKey,omitempty" yaml:"alertingRuleTenantLabelKey,omitempty"`
	AlertingRuleNamespaceLabelKey   string        `json:"alertingRuleNamespaceLabelKey,omitempty" yaml:"alertingRuleNamespaceLabelKey,omitempty"`
	Timeout                         time.Duration `json:"timeout,omitempty" yaml:"timeout,omitempty"`
	LogsLimit                       int           `json:"logsLimit,omitempty" yaml:"logsLimit,omitempty"`
	Schema                          string        `json:"schema,omitempty" yaml:"schema,omitempty"`
	ShowTimezoneSelector            bool          `json:"showTimezoneSelector,omitempty" yaml:"showTimezoneSelector,omitempty"`
}

func (pluginConfig *PluginConfig) MarshalJSON() ([]byte, error) {
	type Alias PluginConfig
	return json.Marshal(&struct {
		Timeout float64 `json:"timeout,omitempty"`
		*Alias
	}{
		Timeout: pluginConfig.Timeout.Seconds(),
		Alias:   (*Alias)(pluginConfig),
	})
}

func CreateServer(ctx context.Context, cfg *Config) (*PluginServer, error) {
	if err := cfg.ValidateTLSConfig(); err != nil {
		return nil, err
	}

	serverCtx, cancel := context.WithCancel(ctx)
	httpServer, err := createHTTPServer(serverCtx, cfg)
	if err != nil {
		cancel()
		return nil, err
	}

	return &PluginServer{
		Config: cfg,
		Server: httpServer,
		cancel: cancel,
	}, nil
}

func (s *PluginServer) StartHTTPServer() error {
	if s.Config.IsTLSEnabled() {
		slog.Infof("listening for https on %s", s.Server.Addr)
		return s.Server.ListenAndServeTLS(s.Config.CertFile, s.Config.PrivateKeyFile)
	}
	slog.Infof("listening for http on %s", s.Server.Addr)
	return s.Server.ListenAndServe()
}

func (s *PluginServer) Shutdown(ctx context.Context) error {
	if s.cancel != nil {
		s.cancel()
	}
	if s.Server != nil {
		return s.Server.Shutdown(ctx)
	}
	return nil
}

func createHTTPServer(ctx context.Context, cfg *Config) (*http.Server, error) {
	router := setupRoutes(cfg)
	router.Use(corsHeaderMiddleware(cfg))

	// clients must use TLS 1.2 or higher
	tlsConfig := &tls.Config{}

	tlsEnabled := cfg.IsTLSEnabled()
	if tlsEnabled {
		// Set MinVersion - default to TLS 1.2 if not specified
		if cfg.TLSMinVersion != 0 {
			tlsConfig.MinVersion = cfg.TLSMinVersion
		} else {
			tlsConfig.MinVersion = tls.VersionTLS12
		}

		if len(cfg.TLSCipherSuites) > 0 {
			tlsConfig.CipherSuites = cfg.TLSCipherSuites
		}

		// Build and run the controller which reloads the certificate and key
		// files whenever they change.
		certKeyPair, err := dynamiccertificates.NewDynamicServingContentFromFiles("serving-cert", cfg.CertFile, cfg.PrivateKeyFile)
		if err != nil {
			slog.WithError(err).Fatal("unable to create TLS controller")
		}

		if err := certKeyPair.RunOnce(ctx); err != nil {
			slog.WithError(err).Fatal("failed to initialize cert/key content")
		}

		eventBroadcaster := record.NewBroadcaster()
		eventBroadcaster.StartLogging(func(format string, args ...interface{}) {
			slog.Infof(format, args...)
		})

		ctrl := dynamiccertificates.NewDynamicServingCertificateController(
			tlsConfig,
			nil,
			certKeyPair,
			nil,
			record.NewEventRecorderAdapter(
				eventBroadcaster.NewRecorder(scheme.Scheme, v1.EventSource{Component: "logging-view-plugin"}),
			),
		)

		// Configure the server to use the cert/key pair for all client connections.
		tlsConfig.GetConfigForClient = ctrl.GetConfigForClient

		// Notify cert/key file changes to the controller.
		certKeyPair.AddListener(ctrl)

		// Start certificate controllers in background
		go ctrl.Run(1, ctx.Done())
		go certKeyPair.Run(ctx, 1)
	}

	httpServer := &http.Server{
		Handler:      router,
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		TLSConfig:    tlsConfig,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	if logrus.GetLevel() == logrus.TraceLevel {
		loggedRouter := handlers.LoggingHandler(slog.Logger.Out, router)
		httpServer.Handler = loggedRouter
	}

	return httpServer, nil
}

func setupRoutes(cfg *Config) *mux.Router {
	r := mux.NewRouter()

	r.PathPrefix("/health").HandlerFunc(healthHandler())

	// serve plugin manifest according to enabled features
	r.Path("/plugin-manifest.json").Handler(manifestHandler(cfg))

	// serve enabled features list to the front-end
	r.PathPrefix("/features").HandlerFunc(featuresHandler(cfg))

	// serve plugin configuration to the front-end
	r.PathPrefix("/config").HandlerFunc(configHandler(cfg))

	// serve front end files
	r.PathPrefix("/").Handler(filesHandler(http.Dir(cfg.StaticPath)))

	return r
}

type headerPreservingWriter struct {
	http.ResponseWriter
	wroteHeader bool
}

func (w *headerPreservingWriter) WriteHeader(statusCode int) {
	if !w.wroteHeader {
		if w.Header().Get("Cache-Control") == "" {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		}
		if w.Header().Get("Expires") == "" {
			w.Header().Set("Expires", "0")
		}
		w.wroteHeader = true
	}
	w.ResponseWriter.WriteHeader(statusCode)
}

func filesHandler(root http.FileSystem) http.Handler {
	fileServer := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// disable caching for plugin entry point
		if strings.HasPrefix(r.URL.Path, "/plugin-entry.js") {
			fileServer.ServeHTTP(&headerPreservingWriter{ResponseWriter: w}, r)
			return
		}
		fileServer.ServeHTTP(w, r)
	})
}

func healthHandler() http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
}

func corsHeaderMiddleware(cfg *Config) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headers := w.Header()
			headers.Set("Access-Control-Allow-Origin", "*")
			next.ServeHTTP(w, r)
		})
	}
}

func featuresHandler(cfg *Config) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jsonFeatures, err := json.Marshal(cfg.Features)

		if err != nil {
			slog.WithError(err).Errorf("cannot marshall, features were: %v", string(jsonFeatures))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonFeatures)
	})
}

func configHandler(cfg *Config) http.HandlerFunc {
	pluginConfData, err := os.ReadFile(cfg.PluginConfigPath)

	if err != nil {
		slog.WithError(err).Warnf("cannot read config file, serving plugin with default configuration, tried %s", cfg.PluginConfigPath)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("{}"))
		})
	}

	var pluginConfig PluginConfig
	err = yaml.Unmarshal(pluginConfData, &pluginConfig)

	if err != nil {
		slog.WithError(err).Error("unable to unmarshall config data")
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unable to unmarshall config data", http.StatusInternalServerError)
		})
	}

	jsonPluginConfig, err := pluginConfig.MarshalJSON()

	if err != nil {
		slog.WithError(err).Errorf("unable to marshall, config data: %v", pluginConfig)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unable to marshall config data", http.StatusInternalServerError)
		})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonPluginConfig)
	})
}

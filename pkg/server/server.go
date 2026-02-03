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

func Start(cfg *Config) {
	router := setupRoutes(cfg)
	router.Use(corsHeaderMiddleware(cfg))

	// clients must use TLS 1.2 or higher
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	tlsEnabled := cfg.CertFile != "" && cfg.PrivateKeyFile != ""
	if tlsEnabled {
		// Build and run the controller which reloads the certificate and key
		// files whenever they change.
		ctx := context.Background()

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

	if tlsEnabled {
		slog.Infof("listening for https on %s", httpServer.Addr)
		panic(httpServer.ListenAndServeTLS(cfg.CertFile, cfg.PrivateKeyFile))
	} else {
		slog.Infof("listening for http on %s", httpServer.Addr)
		panic(httpServer.ListenAndServe())
	}
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

func filesHandler(root http.FileSystem) http.Handler {
	fileServer := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		filePath := r.URL.Path

		// disable caching for plugin entry point
		if strings.HasPrefix(filePath, "/plugin-entry.js") {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Expires", "0")
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

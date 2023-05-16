package server

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

var slog = logrus.WithField("module", "server")

type Config struct {
	Port           int
	CertFile       string
	PrivateKeyFile string
	Features       map[string]bool
	StaticPath     string
	ConfigPath     string
}

func Start(cfg *Config) {
	router := setupRoutes(cfg)
	router.Use(corsHeaderMiddleware(cfg))

	loggedRouter := handlers.LoggingHandler(slog.Logger.Out, router)

	// clients must use TLS 1.2 or higher
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	httpServer := &http.Server{
		Handler:      loggedRouter,
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		TLSConfig:    tlsConfig,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	if cfg.CertFile != "" && cfg.PrivateKeyFile != "" {
		slog.Infof("listening on https://:%d", cfg.Port)
		panic(httpServer.ListenAndServeTLS(cfg.CertFile, cfg.PrivateKeyFile))
	} else {
		slog.Infof("listening on http://:%d", cfg.Port)
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
			slog.WithError(err).Errorf("cannot unmarshal, features were: %v", string(jsonFeatures))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonFeatures)
	})
}

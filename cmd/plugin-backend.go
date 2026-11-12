package main

import (
	"context"
	"crypto/tls"
	"flag"
	"os"
	"strconv"

	"github.com/openshift/logging-view-plugin/pkg/server"
	"github.com/sirupsen/logrus"
	k8sapiflag "k8s.io/component-base/cli/flag"
)

var (
	_                  = flag.String("features", "", "deprecated: ignored; all features are enabled")
	_                  = flag.String("config-path", "", "deprecated: ignored; manifest patches are no longer used")
	portArg            = flag.Int("port", 0, "server port to listen on (default: 9002)")
	certArg            = flag.String("cert", "", "cert file path to enable TLS (disabled by default)")
	keyArg             = flag.String("key", "", "private key file path to enable TLS (disabled by default)")
	staticPathArg      = flag.String("static-path", "", "static files path to serve frontend (default: './web/dist')")
	pluginConfigArg    = flag.String("plugin-config-path", "", "plugin yaml configuration")
	logLevelArg        = flag.String("log-level", logrus.InfoLevel.String(), "verbosity of logs\noptions: ['panic', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']\n'trace' level will log all incoming requests\n(default 'error')")
	tlsMinVersionArg   = flag.String("tls-min-version", "", "minimum TLS version supported. Values are from tls package constants (https://golang.org/pkg/crypto/tls/#pkg-constants)\n(default 'VersionTLS12')")
	tlsMaxVersionArg   = flag.String("tls-max-version", "", "maximum TLS version supported. Values are from tls package constants (https://golang.org/pkg/crypto/tls/#pkg-constants)\n(default is the highest supported by Go)")
	tlsCipherSuitesArg = flag.String("tls-cipher-suites", "", "comma-separated list of cipher suites for the server.\nValues are from tls package constants (https://golang.org/pkg/crypto/tls/#pkg-constants).\nIf omitted, the default Go cipher suite will be used")
	tlsCurvesArg       = flag.String("tls-curves", "", "comma-separated list of TLS curves for the server\nvalues are tls.CurveID names (https://pkg.go.dev/crypto/tls#CurveID) or OpenShift TLS group names")
	log                = logrus.WithField("module", "main")
)

func main() {
	flag.Parse()

	port := mergeEnvValueInt("PORT", *portArg, 9002)
	cert := mergeEnvValue("CERT_FILE_PATH", *certArg, "")
	key := mergeEnvValue("PRIVATE_KEY_FILE_PATH", *keyArg, "")
	staticPath := mergeEnvValue("LOGGING_VIEW_PLUGIN_STATIC_PATH", *staticPathArg, "./web/dist")
	pluginConfigPath := mergeEnvValue("LOGGING_VIEW_PLUGIN_CONFIG_PATH", *pluginConfigArg, "/etc/plugin/config.yaml")
	logLevel := mergeEnvValue("LOGGING_VIEW_PLUGIN_LOG_LEVEL", *logLevelArg, logrus.InfoLevel.String())
	tlsMinVersion := mergeEnvValue("TLS_MIN_VERSION", *tlsMinVersionArg, "VersionTLS12")
	tlsMaxVersion := mergeEnvValue("TLS_MAX_VERSION", *tlsMaxVersionArg, "")
	tlsCipherSuites := mergeEnvValue("TLS_CIPHER_SUITES", *tlsCipherSuitesArg, "")
	tlsCurves := mergeEnvValue("TLS_CURVES", *tlsCurvesArg, "")

	logrusLevel, err := logrus.ParseLevel(logLevel)
	if err != nil {
		logrusLevel = logrus.ErrorLevel
		logrus.WithError(err).Warnf("Invalid log level. Defaulting to %q", logrusLevel.String())
	}

	logrus.SetLevel(logrusLevel)

	// Parse TLS configuration using k8sapiflag
	tlsMinVer, err := k8sapiflag.TLSVersion(tlsMinVersion)
	if err != nil {
		log.Fatalf("Invalid TLS version %q: %v", tlsMinVersion, err)
	}

	var tlsMaxVer uint16
	if tlsMaxVersion != "" {
		tlsMaxVer, err = k8sapiflag.TLSVersion(tlsMaxVersion)
		if err != nil {
			// The error would echo the raw input, so only list the valid values.
			log.Fatalf("Invalid TLS max version, valid values are %q", k8sapiflag.TLSPossibleVersions())
		}
		log.Infof("Max TLS version: %q", tls.VersionName(tlsMaxVer))
	}

	tlsCiphers, err := server.ParseCipherSuites(tlsCipherSuites)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS cipher suites configuration")
	}
	if len(tlsCiphers) > 0 {
		log.Infof("TLS ciphers: %q", server.CipherSuiteNames(tlsCiphers))
	}

	tlsCurvePrefs, err := server.ParseCurves(tlsCurves)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS curves configuration")
	}
	if len(tlsCurvePrefs) > 0 {
		log.Infof("TLS curves: %q", tlsCurvePrefs)
	}

	srv, err := server.CreateServer(context.Background(), &server.Config{
		Port:                port,
		CertFile:            cert,
		PrivateKeyFile:      key,
		StaticPath:          staticPath,
		PluginConfigPath:    pluginConfigPath,
		TLSMinVersion:       tlsMinVer,
		TLSMaxVersion:       tlsMaxVer,
		TLSCipherSuites:     tlsCiphers,
		TLSCurvePreferences: tlsCurvePrefs,
	})
	if err != nil {
		panic(err)
	}

	if err = srv.StartHTTPServer(); err != nil {
		panic(err)
	}
}

func mergeEnvValue(key string, arg string, defaultValue string) string {
	if arg != "" {
		return arg
	}

	envValue := os.Getenv(key)

	if envValue != "" {
		return envValue
	}

	return defaultValue
}

func mergeEnvValueInt(key string, arg int, defaultValue int) int {
	if arg != 0 {
		return arg
	}

	envValue := os.Getenv(key)

	num, err := strconv.Atoi(envValue)
	if err == nil && num != 0 {
		return num
	}

	return defaultValue
}

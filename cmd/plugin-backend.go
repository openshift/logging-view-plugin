package main

import (
	"context"
	"crypto/tls"
	"flag"
	"os"
	"strconv"
	"strings"

	"github.com/openshift/logging-view-plugin/pkg/server"
	"github.com/sirupsen/logrus"
)

var (
	portArg            = flag.Int("port", 0, "server port to listen on (default: 9002)")
	certArg            = flag.String("cert", "", "cert file path to enable TLS (disabled by default)")
	keyArg             = flag.String("key", "", "private key file path to enable TLS (disabled by default)")
	featuresArg        = flag.String("features", "", "enabled features, comma separated")
	staticPathArg      = flag.String("static-path", "", "static files path to serve frontend (default: './web/dist')")
	configPathArg      = flag.String("config-path", "", "config files path (default: './config')")
	pluginConfigArg    = flag.String("plugin-config-path", "", "plugin yaml configuration")
	logLevelArg        = flag.String("log-level", logrus.InfoLevel.String(), "verbosity of logs\noptions: ['panic', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']\n'trace' level will log all incoming requests\n(default 'error')")
	tlsMinVersionArg   = flag.String("tls-min-version", "", "minimum TLS version\noptions: ['VersionTLS10', 'VersionTLS11', 'VersionTLS12', 'VersionTLS13']\n(default 'VersionTLS12')")
	tlsMaxVersionArg   = flag.String("tls-max-version", "", "maximum TLS version\noptions: ['VersionTLS10', 'VersionTLS11', 'VersionTLS12', 'VersionTLS13']\n(default is the highest supported by Go)")
	tlsCipherSuitesArg = flag.String("tls-cipher-suites", "", "comma-separated list of cipher suites for the server\nvalues are from tls package constants (https://golang.org/pkg/crypto/tls/#pkg-constants)")
	log                = logrus.WithField("module", "main")
)

func main() {
	flag.Parse()

	port := mergeEnvValueInt("PORT", *portArg, 9002)
	cert := mergeEnvValue("CERT_FILE_PATH", *certArg, "")
	key := mergeEnvValue("PRIVATE_KEY_FILE_PATH", *keyArg, "")
	features := mergeEnvValue("LOGGING_VIEW_PLUGIN_FEATURES", *featuresArg, "")
	staticPath := mergeEnvValue("LOGGING_VIEW_PLUGIN_STATIC_PATH", *staticPathArg, "./web/dist")
	configPath := mergeEnvValue("LOGGING_VIEW_PLUGIN_MANIFEST_CONFIG_PATH", *configPathArg, "./config")
	pluginConfigPath := mergeEnvValue("LOGGING_VIEW_PLUGIN_CONFIG_PATH", *pluginConfigArg, "/etc/plugin/config.yaml")
	logLevel := mergeEnvValue("LOGGING_VIEW_PLUGIN_LOG_LEVEL", *logLevelArg, logrus.InfoLevel.String())
	tlsMinVersion := mergeEnvValue("TLS_MIN_VERSION", *tlsMinVersionArg, "")
	tlsMaxVersion := mergeEnvValue("TLS_MAX_VERSION", *tlsMaxVersionArg, "")
	tlsCipherSuites := mergeEnvValue("TLS_CIPHER_SUITES", *tlsCipherSuitesArg, "")

	featuresList := strings.Fields(strings.Join(strings.Split(strings.ToLower(features), ","), " "))

	featuresSet := make(map[string]bool)
	for _, s := range featuresList {
		featuresSet[s] = true
	}

	logrusLevel, err := logrus.ParseLevel(logLevel)
	if err != nil {
		logrusLevel = logrus.ErrorLevel
		logrus.WithError(err).Warnf("Invalid log level. Defaulting to %q", logrusLevel.String())
	}

	logrus.SetLevel(logrusLevel)

	log.Infof("enabled features: %+q\n", featuresList)

	// Parse TLS configuration
	tlsMinVer := parseTLSVersion(tlsMinVersion)
	tlsMaxVer := parseTLSVersion(tlsMaxVersion)
	tlsCiphers := parseCipherSuites(tlsCipherSuites)

	srv, err := server.CreateServer(context.Background(), &server.Config{
		Port:             port,
		CertFile:         cert,
		PrivateKeyFile:   key,
		Features:         featuresSet,
		StaticPath:       staticPath,
		ConfigPath:       configPath,
		PluginConfigPath: pluginConfigPath,
		TLSMinVersion:    tlsMinVer,
		TLSMaxVersion:    tlsMaxVer,
		TLSCipherSuites:  tlsCiphers,
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
	if err != nil && num != 0 {
		return num
	}

	return defaultValue
}

func getCipherSuitesMap() map[string]uint16 {
	result := make(map[string]uint16)

	for _, suite := range tls.CipherSuites() {
		result[suite.Name] = suite.ID
	}

	return result
}

func getTLSVersionsMap() map[string]uint16 {
	versions := make(map[string]uint16)

	versions["VersionTLS10"] = tls.VersionTLS10
	versions["VersionTLS11"] = tls.VersionTLS11
	versions["VersionTLS12"] = tls.VersionTLS12
	versions["VersionTLS13"] = tls.VersionTLS13

	return versions
}

func parseTLSVersion(version string) uint16 {
	if version == "" {
		return tls.VersionTLS12
	}

	tlsVersions := getTLSVersionsMap()

	if v, ok := tlsVersions[version]; ok {
		return v
	}

	log.Warnf("Invalid TLS version %q, using default VersionTLS12", version)
	return tls.VersionTLS12
}

func parseCipherSuites(ciphers string) []uint16 {
	if ciphers == "" {
		return nil
	}

	cipherMap := getCipherSuitesMap()

	cipherNames := strings.Split(strings.ReplaceAll(ciphers, " ", ""), ",")
	var result []uint16

	for _, name := range cipherNames {
		if name == "" {
			continue
		}
		if cipher, ok := cipherMap[name]; ok {
			result = append(result, cipher)
		} else {
			log.Warnf("Unknown cipher suite %q, skipping", name)
		}
	}

	if len(result) == 0 {
		log.Warn("No valid cipher suites provided, using Go defaults")
		return nil
	}

	return result
}

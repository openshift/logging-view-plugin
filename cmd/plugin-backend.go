package main

import (
	"flag"
	"os"
	"strconv"
	"strings"

	"github.com/openshift/logging-view-plugin/pkg/server"
	"github.com/sirupsen/logrus"
)

var (
	portArg         = flag.Int("port", 0, "server port to listen on (default: 9002)")
	certArg         = flag.String("cert", "", "cert file path to enable TLS (disabled by default)")
	keyArg          = flag.String("key", "", "private key file path to enable TLS (disabled by default)")
	featuresArg     = flag.String("features", "", "enabled features, comma separated")
	staticPathArg   = flag.String("static-path", "", "static files path to serve frontend (default: './web/dist')")
	configPathArg   = flag.String("config-path", "", "config files path (default: './config')")
	pluginConfigArg = flag.String("plugin-config-path", "", "plugin yaml configuration")
	logLevelArg     = flag.String("log-level", logrus.InfoLevel.String(), "verbosity of logs\noptions: ['panic', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']\n'trace' level will log all incoming requests\n(default 'error')")
	log             = logrus.WithField("module", "main")
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

	server.Start(&server.Config{
		Port:             port,
		CertFile:         cert,
		PrivateKeyFile:   key,
		Features:         featuresSet,
		StaticPath:       staticPath,
		ConfigPath:       configPath,
		PluginConfigPath: pluginConfigPath,
	})
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

package server

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	jsonpatch "github.com/evanphx/json-patch"
	"github.com/sirupsen/logrus"
)

var mlog = logrus.WithField("module", "manifest")

func manifestHandler(cfg *Config) http.HandlerFunc {
	baseManifestData, err := os.ReadFile(filepath.Join(cfg.StaticPath, "plugin-manifest.json"))
	if err != nil {
		mlog.WithError(err).Error("cannot read base manifest file")
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		})
	}

	patchedManifest := patchManifest(baseManifestData, cfg)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Expires", "0")

		if _, err := w.Write(patchedManifest); err != nil {
			mlog.WithError(err).Error("cannot write manifest response")
		}
	})
}

func patchManifest(baseManifestData []byte, cfg *Config) []byte {
	if len(cfg.Features) == 0 {
		return baseManifestData
	}

	configRoot, err := os.OpenRoot(cfg.ConfigPath)
	if err != nil {
		mlog.WithError(err).Errorf("cannot open config path root %s", cfg.ConfigPath)
		return baseManifestData
	}
	defer configRoot.Close()

	patchedManifest := baseManifestData
	patchedManifest = performPatch(configRoot, baseManifestData, "clear-extensions.patch.json")

	// Add alert charts if any of the alert features are enabled
	if cfg.Features["alerts"] || cfg.Features["dev-alerts"] {
		patchedManifest = performPatch(configRoot, patchedManifest, "alerts-charts.patch.json")
	}

	for k := range cfg.Features {
		patchedManifest = performPatch(configRoot, patchedManifest, fmt.Sprintf("%s.patch.json", k))
	}

	return []byte(patchedManifest)
}

func performPatch(root *os.Root, originalData []byte, patchFileName string) []byte {
	patchFile, err := root.Open(patchFileName)
	if err != nil {
		mlog.WithField("reason", err).Warnf("cannot read patch file %s", patchFileName)
		return originalData
	}
	defer patchFile.Close()

	patchBytes, err := io.ReadAll(patchFile)
	if err != nil {
		mlog.WithField("reason", err).Warnf("cannot read patch file contents %s", patchFileName)
		return originalData
	}

	patch, err := jsonpatch.DecodePatch(patchBytes)
	if err != nil {
		mlog.WithField("reason", err).Warnf("cannot decode patch data %s", patchBytes)
		return originalData
	}

	patchedManifest, err := patch.ApplyIndent(originalData, " ")
	if err != nil {
		mlog.WithError(err).Error("cannot patch base manifest file")
		return originalData
	}

	return patchedManifest
}

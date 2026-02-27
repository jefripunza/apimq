package variable

import (
	"os"
	"path/filepath"
)

var UploadsPath string

func init() {
	cwd, _ := os.Getwd()
	UploadsPath = filepath.Join(cwd, "uploads")
	os.MkdirAll(UploadsPath, 0755)
}

# v2v private voting

Voter to voter private voting app.

### Build Wesh binaries
We have to compile weshnet (written in golang) to shared library so that I can call it from NodeJS.

To do so we create a wrapper file `wrapper/wrapper.go` which exposes the functions we want to call from NodeJS.

```go
package main

import (
	"C"
	"berty.tech/weshnet"
)

//export NewPersistentServiceClient
func NewPersistentServiceClient() {
	weshnet.NewPersistentServiceClient("data1")
}
func main() {} // Required for c-shared build mode
```

Then build the package with

```bash
go1.20.8 build -o libweshnet.so -buildmode=c-shared wrapper/wrapper.go
```
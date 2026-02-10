# audio utils

## build

### requirements

- `vcpkg`
- `cmake`
- `ninja`
- `llvm` (windows)

### linux (static)

```bash
export VCPKG_ROOT=/path/to/vcpkg
export VCPKG_DEFAULT_TRIPLET=x64-linux
export VCPKG_TARGET_TRIPLET=x64-linux
export CMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
vcpkg install
bun run build
```

### windows (static)

```powershell
$env:VCPKG_ROOT="C:\vcpkg"
$env:VCPKG_DEFAULT_TRIPLET="x64-windows-static"
$env:VCPKG_TARGET_TRIPLET="x64-windows-static"
$env:CMAKE_TOOLCHAIN_FILE="$env:VCPKG_ROOT\scripts\buildsystems\vcpkg.cmake"
vcpkg install
bun run build
```

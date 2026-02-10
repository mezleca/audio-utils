cmake_minimum_required(VERSION 3.16)

if(NOT DEFINED CMAKE_TOOLCHAIN_FILE AND DEFINED ENV{CMAKE_TOOLCHAIN_FILE})
    set(CMAKE_TOOLCHAIN_FILE "$ENV{CMAKE_TOOLCHAIN_FILE}" CACHE FILEPATH "Toolchain file" FORCE)
endif()

if(WIN32)
    if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        if(EXISTS "${CMAKE_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake")
            set(CMAKE_TOOLCHAIN_FILE "${CMAKE_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake")
        elseif(EXISTS "C:/vcpkg/scripts/buildsystems/vcpkg.cmake")
            set(CMAKE_TOOLCHAIN_FILE "C:/vcpkg/scripts/buildsystems/vcpkg.cmake")
        endif()
    endif()
    set(VCPKG_TARGET_TRIPLET "x64-windows-static")

    set(CMAKE_CXX_COMPILER "C:/Program Files/LLVM/bin/clang-cl.exe")
    set(CMAKE_C_COMPILER "C:/Program Files/LLVM/bin/clang-cl.exe")
    set(CMAKE_LINKER "C:/Program Files/LLVM/bin/lld-link.exe")
    set(CMAKE_MT "C:/Program Files/LLVM/bin/llvm-mt.exe")
    set(CMAKE_RC_COMPILER "C:/Program Files/LLVM/bin/llvm-rc.exe")
    set(BUILD_SHARED_LIBS OFF)
else()
    set(CMAKE_POSITION_INDEPENDENT_CODE ON)
endif()

project(audio-utils VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

file(GLOB_RECURSE COMMON_SOURCES CONFIGURE_DEPENDS "src/native/*.cpp")
file(GLOB_RECURSE COMMON_HEADERS CONFIGURE_DEPENDS "src/native/*.hpp")

if(WIN32)
    find_package(SndFile CONFIG REQUIRED)
    set(SNDFILE_LIBRARIES SndFile::sndfile)
else()
    if(DEFINED CMAKE_TOOLCHAIN_FILE)
        find_package(SndFile CONFIG REQUIRED)
        set(SNDFILE_LIBRARIES SndFile::sndfile)
    else()
        find_package(PkgConfig REQUIRED)
        pkg_check_modules(SNDFILE REQUIRED sndfile)
    endif()
endif()

add_library(${PROJECT_NAME} SHARED ${COMMON_SOURCES} ${COMMON_HEADERS} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

execute_process(
    COMMAND node -p "require('node-addon-api').include"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE NODE_ADDON_API_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${PROJECT_NAME} PUBLIC
    ${NODE_ADDON_API_DIR}
    ${CMAKE_JS_INC}
    ${SNDFILE_INCLUDE_DIRS}
)

target_link_libraries(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_LIB}
    ${SNDFILE_LIBRARIES}
)

target_compile_definitions(${PROJECT_NAME} PRIVATE NODE_ADDON_API_CPP_EXCEPTIONS)

# windows-specific linker flag
if(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE delayimp.lib)
endif()

# clang-cl needs /EHsc for exception handling
if(WIN32 AND CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    target_compile_options(${PROJECT_NAME} PRIVATE /EHsc)
endif()

# copy compile_commands.json
add_custom_target(copy_compile_commands ALL
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    ${CMAKE_BINARY_DIR}/compile_commands.json
    ${CMAKE_SOURCE_DIR}/compile_commands.json
)

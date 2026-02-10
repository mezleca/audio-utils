#include <napi.h>
#include <iostream>
#include <mutex>
#include <string>
#include <unordered_map>
#include <sndfile.h>

#ifdef _WIN32
#include <windows.h>
#endif

#ifdef _WIN32
static std::wstring utf8_to_wide(const std::string& value) {
    if (value.empty()) {
        return std::wstring();
    }

    int size_needed = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.c_str(), -1, nullptr, 0);
    if (size_needed <= 0) {
        return std::wstring();
    }

    std::wstring result(static_cast<size_t>(size_needed), L'\0');
    int converted = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.c_str(), -1, result.data(), size_needed);
    if (converted <= 0) {
        return std::wstring();
    }

    if (!result.empty()) {
        result.pop_back();
    }

    return result;
}
#endif

static std::unordered_map<uint32_t, std::string> error_map;
static std::mutex error_mutex;

static void set_error(uint32_t call_id, const std::string& message) {
    std::lock_guard<std::mutex> lock(error_mutex);
    error_map[call_id] = message;
}

static std::string take_error(uint32_t call_id) {
    std::lock_guard<std::mutex> lock(error_mutex);
    auto it = error_map.find(call_id);
    if (it == error_map.end()) {
        return std::string();
    }

    std::string message = it->second;
    error_map.erase(it);
    return message;
}

double get_duration(uint32_t call_id, std::string path) {
    SF_INFO info{};
#ifdef _WIN32
    std::wstring wide_path = utf8_to_wide(path);
    if (wide_path.empty()) {
        set_error(call_id, "failed to convert path to UTF-16");
        return 0.0;
    }
    SNDFILE *file = sf_wchar_open(wide_path.c_str(), SFM_READ, &info);
#else
    SNDFILE *file = sf_open(path.c_str(), SFM_READ, &info);
#endif

    if (!file) {
        const char* message = sf_strerror(nullptr);
        if (message != nullptr && message[0] != '\0') {
            set_error(call_id, message);
        } else {
            set_error(call_id, "failed to open file");
        }
        return 0.0;
    }

    if (info.samplerate <= 0) {
        sf_close(file);
        set_error(call_id, "invalid samplerate");
        return 0.0;
    }

    double duration = static_cast<double>(info.frames) / info.samplerate;

    sf_close(file);
    return duration;
}

Napi::Value node_get_duration(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        return env.Null();
    }
    if (!info[0].IsNumber() || !info[1].IsString()) {
        return env.Null();
    }

    uint32_t call_id = info[0].As<Napi::Number>().Uint32Value();
    double duration = get_duration(call_id, info[1].As<Napi::String>().Utf8Value());
    std::string error_message = take_error(call_id);

    if (!error_message.empty()) {
        set_error(call_id, error_message);
        return env.Null();
    }

    return Napi::Number::New(env, duration);
}

Napi::Value node_get_last_error(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        return env.Null();
    }

    uint32_t call_id = info[0].As<Napi::Number>().Uint32Value();
    std::string message = take_error(call_id);
    if (message.empty()) {
        return env.Null();
    }

    return Napi::String::New(env, message);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("get_duration", Napi::Function::New(env, node_get_duration));
    exports.Set("get_last_error", Napi::Function::New(env, node_get_last_error));
    return exports;
}

NODE_API_MODULE(audio_utils, Init)

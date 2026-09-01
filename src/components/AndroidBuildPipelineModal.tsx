import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Terminal,
  CheckCircle2,
  Copy,
  Play,
  Settings,
  Vibrate,
  FileCode,
  Download,
  Flame,
} from 'lucide-react';
import { touchHaptics } from '../engine/TouchHaptics';

interface AndroidBuildPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateDeviceSimulator: () => void;
}

export const AndroidBuildPipelineModal: React.FC<AndroidBuildPipelineModalProps> = ({
  isOpen,
  onClose,
  onActivateDeviceSimulator,
}) => {
  const [targetArch, setTargetArch] = useState<'arm64-v8a' | 'armeabi-v7a' | 'x86_64'>('arm64-v8a');
  const [sdkLevel, setSdkLevel] = useState<number>(33);
  const [activeTab, setActiveTab] = useState<'build' | 'manifest' | 'gradle' | 'test'>('build');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileLogs, setCompileLogs] = useState<string[]>([]);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const fpcCommand = `fpc -Tandroid -P${targetArch === 'arm64-v8a' ? 'aarch64' : targetArch === 'armeabi-v7a' ? 'arm' : 'x86_64'} \\
  -MObjFPC -Scghi -O3 -CX -XX \\
  -Fl/opt/android-ndk-r25c/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/${targetArch === 'arm64-v8a' ? 'aarch64' : targetArch === 'armeabi-v7a' ? 'arm' : 'x86_64'}-linux-android/${sdkLevel} \\
  -FD/opt/android-ndk-r25c/toolchains/llvm/prebuilt/linux-x86_64/bin \\
  -FE./android/app/src/main/jniLibs/${targetArch} \\
  ./src/pascal/NetCrawlerGame.pas`;

  const manifestXML = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.netcrawler.spriteengine"
    android:versionCode="100"
    android:versionName="1.0.0">

    <!-- Hardware Haptic Vibration Permission -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-feature android:glEsVersion="0x00030000" android:required="true" />

    <application
        android:label="NetCrawler 2D"
        android:hasCode="false"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">

        <activity
            android:name="android.app.NativeActivity"
            android:label="NetCrawler 2D"
            android:configChanges="orientation|keyboardHidden|screenSize|screenLayout"
            android:exported="true">
            <meta-data android:name="android.app.lib_name" android:value="netcrawler" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const gradleConfig = `apply plugin: 'com.android.application'

android {
    compileSdkVersion ${sdkLevel}
    ndkVersion "25.2.9519653"

    defaultConfig {
        applicationId "com.netcrawler.spriteengine"
        minSdkVersion 21
        targetSdkVersion ${sdkLevel}
        versionCode 1
        versionName "1.0.0"

        ndk {
            abiFilters '${targetArch}', 'arm64-v8a', 'armeabi-v7a'
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    
    sourceSets {
        main {
            jniLibs.srcDirs = ['src/main/jniLibs']
            assets.srcDirs = ['src/main/assets']
        }
    }
}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeedback(label);
    touchHaptics.trigger('light_tap');
    setTimeout(() => setCopiedFeedback(null), 2500);
  };

  const handleSimulateBuild = () => {
    setIsCompiling(true);
    setCompileLogs([
      '>> [PIPELINE] Initializing FreePascal Android Toolchain...',
      `>> Target Architecture: ${targetArch} (API Level ${sdkLevel})`,
      '>> Validating modular units: AssetManager.pas, SpriteBatcher.pas, TouchHaptics.pas...',
      '>> Slicing master texture atlas into assets/textures/...',
      '>> Cross-compiling libnetcrawler.so...',
    ]);

    setTimeout(() => {
      setCompileLogs((prev) => [
        ...prev,
        '>> [FPC] Compiling UAssetManager.pas (LRU Texture Pool: OK)',
        '>> [FPC] Compiling USpriteBatcher.pas (Zero-GC Draw Call Coalescing: OK)',
        '>> [FPC] Compiling UTouchHaptics.pas (JNI Android Vibrator Bridge: OK)',
        '>> [STRIP] Stripping debug symbols for arm64-v8a -> 2.4 MB binary',
      ]);
    }, 900);

    setTimeout(() => {
      setCompileLogs((prev) => [
        ...prev,
        '>> [GRADLE] Packaging APK: app-debug.apk (3.8 MB total with all assets)',
        '>> [ADB] Ready for fast device deployment: adb install app-debug.apk',
        '✅ BUILD SUCCESSFUL in 1.84s',
      ]);
      setIsCompiling(false);
      touchHaptics.trigger('hack_success');
    }, 1900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100 font-serif italic text-base">
            <Smartphone className="w-4 h-4 text-emerald-400 not-italic" />
            <span>Android NDK Cross-Compiler & Device Pipeline</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1E26] text-[#9CA3AF] hover:text-[#E5E7EB] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1F2937] bg-[#11141B] px-4 gap-2">
          <button
            onClick={() => setActiveTab('build')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'build'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cross-Compile Script</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>AndroidManifest.xml</span>
          </button>

          <button
            onClick={() => setActiveTab('gradle')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'gradle'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>build.gradle</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'test'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Physical Gametest Mode</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs text-[#E5E7EB]">
          {/* Architecture and Target Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
            <div>
              <label className="text-[10px] text-[#9CA3AF] uppercase block mb-1 tracking-wider">Target Architecture (ABI)</label>
              <select
                value={targetArch}
                onChange={(e) => setTargetArch(e.target.value as any)}
                className="w-full bg-[#080A0F] border border-[#374151] text-[#E5E7EB] p-2 rounded-md outline-none text-xs focus:border-emerald-500"
              >
                <option value="arm64-v8a">arm64-v8a (64-bit Modern Devices)</option>
                <option value="armeabi-v7a">armeabi-v7a (32-bit Legacy)</option>
                <option value="x86_64">x86_64 (Android Studio Emulator)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9CA3AF] uppercase block mb-1 tracking-wider">Target SDK Level</label>
              <select
                value={sdkLevel}
                onChange={(e) => setSdkLevel(Number(e.target.value))}
                className="w-full bg-[#080A0F] border border-[#374151] text-[#E5E7EB] p-2 rounded-md outline-none text-xs focus:border-emerald-500"
              >
                <option value={33}>Android 13 (API 33)</option>
                <option value={34}>Android 14 (API 34)</option>
                <option value={31}>Android 12 (API 31)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSimulateBuild}
                disabled={isCompiling}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-wider text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              >
                <Flame className="w-4 h-4" />
                <span>{isCompiling ? 'Compiling NDK Pipeline...' : 'Run Pipeline Build'}</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Build Script */}
          {activeTab === 'build' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#FBBF24] font-medium">
                  FreePascal Cross-Compiler Command (`fpc -Tandroid`)
                </div>
                <button
                  onClick={() => handleCopy(fpcCommand, 'Build command copied!')}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Shell Script</span>
                </button>
              </div>

              <pre className="bg-[#080A0F] border border-[#374151] p-3 rounded-md text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {fpcCommand}
              </pre>

              {/* Compilation Logs */}
              {compileLogs.length > 0 && (
                <div className="bg-[#080A0F] border border-[#374151] p-3 rounded-md space-y-1 text-[11px] font-mono max-h-48 overflow-y-auto">
                  <div className="text-[#9CA3AF] uppercase tracking-wider mb-1 font-semibold text-[10px]">Live Compiler Output:</div>
                  {compileLogs.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.startsWith('✅')
                          ? 'text-emerald-400 font-semibold'
                          : line.startsWith('>> [FPC]')
                          ? 'text-[#38BDF8]'
                          : 'text-[#E5E7EB]'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: AndroidManifest */}
          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#FBBF24] font-medium">
                  AndroidManifest.xml (Haptics, Fullscreen, NativeActivity)
                </div>
                <button
                  onClick={() => handleCopy(manifestXML, 'Manifest XML copied!')}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy XML</span>
                </button>
              </div>

              <pre className="bg-[#080A0F] border border-[#374151] p-3 rounded-md text-[11px] text-[#38BDF8] font-mono overflow-x-auto whitespace-pre-wrap">
                {manifestXML}
              </pre>
            </div>
          )}

          {/* Tab 3: build.gradle */}
          {activeTab === 'gradle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#FBBF24] font-medium">
                  app/build.gradle (NDK ABI Filters & JNI Linking)
                </div>
                <button
                  onClick={() => handleCopy(gradleConfig, 'Gradle config copied!')}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Gradle</span>
                </button>
              </div>

              <pre className="bg-[#080A0F] border border-[#374151] p-3 rounded-md text-[11px] text-[#A78BFA] font-mono overflow-x-auto whitespace-pre-wrap">
                {gradleConfig}
              </pre>
            </div>
          )}

          {/* Tab 4: Physical Device Test */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-[#1A1E26] border border-[#374151] p-5 rounded-md text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-sm font-semibold text-[#E5E7EB]">
                  Launch Android Device Gametest Simulator
                </div>
                <p className="text-[#9CA3AF] max-w-md mx-auto text-xs leading-relaxed">
                  Transforms the viewport into a physical Android mobile device with low-latency touch controls, dynamic analog joystick, swipe dash gestures, and real-time vibration haptics.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      onActivateDeviceSimulator();
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-md transition-colors flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch Device Simulator View</span>
                  </button>
                </div>
              </div>

              {/* Haptics & Input verification test */}
              <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md space-y-2">
                <div className="text-xs font-semibold text-[#FBBF24] flex items-center gap-1.5">
                  <Vibrate className="w-3.5 h-3.5" />
                  <span>Test Hardware Haptic Motor Triggers</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => touchHaptics.trigger('light_tap')}
                    className="px-3 py-1.5 bg-[#11141B] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/40 rounded-md text-xs text-[#E5E7EB] transition-colors"
                  >
                    Light Tap (8ms)
                  </button>
                  <button
                    onClick={() => touchHaptics.trigger('attack')}
                    className="px-3 py-1.5 bg-[#11141B] hover:bg-[#252A36] border border-[#374151] hover:border-[#FBBF24]/40 rounded-md text-xs text-[#FBBF24] transition-colors"
                  >
                    Attack Strike (25-12-20ms)
                  </button>
                  <button
                    onClick={() => touchHaptics.trigger('critical')}
                    className="px-3 py-1.5 bg-[#11141B] hover:bg-[#252A36] border border-[#374151] hover:border-[#EF4444]/40 rounded-md text-xs text-[#EF4444] transition-colors"
                  >
                    Critical Hit (Burst)
                  </button>
                  <button
                    onClick={() => touchHaptics.trigger('boss_alert')}
                    className="px-3 py-1.5 bg-[#11141B] hover:bg-[#252A36] border border-[#374151] hover:border-[#A78BFA]/40 rounded-md text-xs text-[#A78BFA] transition-colors"
                  >
                    Boss Alarm (Heavy)
                  </button>
                </div>
              </div>
            </div>
          )}

          {copiedFeedback && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-md flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{copiedFeedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

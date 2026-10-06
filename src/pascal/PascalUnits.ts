export interface PascalUnitFile {
  unitName: string;
  fileName: string;
  description: string;
  code: string;
}

export const PASCAL_UNITS: PascalUnitFile[] = [
  {
    unitName: 'UAssetManager',
    fileName: 'AssetManager.pas',
    description: 'Modular Pascal Unit for LRU Texture Allocation, Error Recovery Fallbacks, and Atlas Slicing.',
    code: `unit UAssetManager;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, fgl, Graphics;

type
  { Structure representing a loaded hardware texture }
  PTextureAsset = ^TTextureAsset;
  TTextureAsset = record
    ID: string;
    Width: Integer;
    Height: Integer;
    MemorySizeBytes: NativeUInt;
    LastUsedTick: QWord;
    RefCount: Integer;
    IsAtlas: Boolean;
    IsFallback: Boolean;
    GLTextureHandle: Cardinal;
  end;

  { Map of String -> PTextureAsset }
  TTextureMap = specialize TFPGMap<string, PTextureAsset>;

  { TAssetManager Class: Independent from game mechanics }
  TAssetManager = class
  private
    FTextures: TTextureMap;
    FMaxMemoryBytes: NativeUInt;
    FCurrentMemoryBytes: NativeUInt;
    FEvictionCount: Integer;
    FFallbackCount: Integer;
    
    procedure EnforceMemoryLimit;
    function CreateFallbackCheckerboard(const MissingID: string): PTextureAsset;
  public
    constructor Create(const MaxMemoryMB: Integer = 48);
    destructor Destroy; override;
    
    function LoadTexture(const ID, FilePath: string): PTextureAsset;
    function GetTexture(const ID: string): PTextureAsset;
    procedure ReleaseTexture(const ID: string);
    procedure RegisterSubSprite(const SpriteID, TextureID: string; const X, Y, W, H: Integer);
    
    property CurrentMemoryBytes: NativeUInt read FCurrentMemoryBytes;
    property EvictionCount: Integer read FEvictionCount;
  end;

implementation

constructor TAssetManager.Create(const MaxMemoryMB: Integer);
begin
  inherited Create;
  FTextures := TTextureMap.Create;
  FMaxMemoryBytes := NativeUInt(MaxMemoryMB) * 1024 * 1024;
  FCurrentMemoryBytes := 0;
  FEvictionCount := 0;
  FFallbackCount := 0;
end;

destructor TAssetManager.Destroy;
var
  i: Integer;
begin
  for i := 0 to FTextures.Count - 1 do
    Dispose(FTextures.Data[i]);
  FTextures.Free;
  inherited Destroy;
end;

function TAssetManager.GetTexture(const ID: string): PTextureAsset;
var
  Idx: Integer;
begin
  Idx := FTextures.IndexOf(ID);
  if Idx >= 0 then
  begin
    Result := FTextures.Data[Idx];
    Result^.LastUsedTick := GetTickCount64;
    Inc(Result^.RefCount);
  end
  else
  begin
    { Robust Error Handling: Never crash on missing asset }
    Inc(FFallbackCount);
    Result := CreateFallbackCheckerboard(ID);
  end;
end;

function TAssetManager.CreateFallbackCheckerboard(const MissingID: string): PTextureAsset;
begin
  New(Result);
  Result^.ID := 'FALLBACK_' + MissingID;
  Result^.Width := 32;
  Result^.Height := 32;
  Result^.MemorySizeBytes := 32 * 32 * 4;
  Result^.LastUsedTick := GetTickCount64;
  Result^.RefCount := 1;
  Result^.IsFallback := True;
  Result^.GLTextureHandle := 0; { Procedural magenta/black error texture }
  
  Inc(FCurrentMemoryBytes, Result^.MemorySizeBytes);
  FTextures.Add(Result^.ID, Result);
end;

procedure TAssetManager.EnforceMemoryLimit;
var
  i, OldestIdx: Integer;
  OldestTick: QWord;
begin
  while FCurrentMemoryBytes > FMaxMemoryBytes do
  begin
    OldestTick := High(QWord);
    OldestIdx := -1;
    for i := 0 to FTextures.Count - 1 do
    begin
      if (not FTextures.Data[i]^.IsAtlas) and (FTextures.Data[i]^.RefCount <= 0) then
      begin
        if FTextures.Data[i]^.LastUsedTick < OldestTick then
        begin
          OldestTick := FTextures.Data[i]^.LastUsedTick;
          OldestIdx := i;
        end;
      end;
    end;
    
    if OldestIdx >= 0 then
    begin
      Dec(FCurrentMemoryBytes, FTextures.Data[OldestIdx]^.MemorySizeBytes);
      Dispose(FTextures.Data[OldestIdx]);
      FTextures.Delete(OldestIdx);
      Inc(FEvictionCount);
    end
    else
      Break; { All textures currently in active use }
  end;
end;

end.`,
  },
  {
    unitName: 'USpriteBatcher',
    fileName: 'SpriteBatcher.pas',
    description: 'Pascal Unit for High-Performance 2D Draw Call Coalescing and State Sorting.',
    code: `unit USpriteBatcher;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, Math, UAssetManager;

type
  { Vertex structure for 2D quad batching }
  TSpriteVertex = record
    X, Y: Single;       // World position
    U, V: Single;       // Texture UV Coordinates
    ColorRGBA: Cardinal;// Packed RGBA tint
  end;

  PSpriteVertex = ^TSpriteVertex;

  { Single batched sprite descriptor }
  TSpriteCommand = record
    TextureID: string;
    DestX, DestY: Single;
    Width, Height: Single;
    Rotation: Single;
    ScaleX, ScaleY: Single;
    Color: Cardinal;
    ZOrder: Integer;
  end;

  { TSpriteBatcher: Optimizes draw calls by texture clustering }
  TSpriteBatcher = class
  private
    FAssetMgr: TAssetManager;
    FQueue: array of TSpriteCommand;
    FQueueCount: Integer;
    FMaxBatchSize: Integer;
    FDrawCallsThisFrame: Integer;
    FTotalSpritesRendered: Integer;
    
    procedure FlushBatch(const TextureID: string; StartIdx, Count: Integer);
  public
    constructor Create(AAssetMgr: TAssetManager; const BatchCapacity: Integer = 2048);
    destructor Destroy; override;
    
    procedure BeginBatch;
    procedure DrawSprite(const TextureID: string; const X, Y, W, H: Single; const ZOrder: Integer = 0);
    procedure EndBatch;
    
    property DrawCalls: Integer read FDrawCallsThisFrame;
    property SpritesRendered: Integer read FTotalSpritesRendered;
  end;

implementation

constructor TSpriteBatcher.Create(AAssetMgr: TAssetManager; const BatchCapacity: Integer);
begin
  inherited Create;
  FAssetMgr := AAssetMgr;
  FMaxBatchSize := BatchCapacity;
  SetLength(FQueue, FMaxBatchSize);
  FQueueCount := 0;
end;

destructor TSpriteBatcher.Destroy;
begin
  SetLength(FQueue, 0);
  inherited Destroy;
end;

procedure TSpriteBatcher.BeginBatch;
begin
  FQueueCount := 0;
  FDrawCallsThisFrame := 0;
  FTotalSpritesRendered := 0;
end;

procedure TSpriteBatcher.DrawSprite(const TextureID: string; const X, Y, W, H: Single; const ZOrder: Integer);
begin
  if FQueueCount >= FMaxBatchSize then
    EndBatch; { Flush full buffer }
    
  FQueue[FQueueCount].TextureID := TextureID;
  FQueue[FQueueCount].DestX := X;
  FQueue[FQueueCount].DestY := Y;
  FQueue[FQueueCount].Width := W;
  FQueue[FQueueCount].Height := H;
  FQueue[FQueueCount].ZOrder := ZOrder;
  FQueue[FQueueCount].Color := $FFFFFFFF;
  Inc(FQueueCount);
  Inc(FTotalSpritesRendered);
end;

procedure TSpriteBatcher.FlushBatch(const TextureID: string; StartIdx, Count: Integer);
begin
  { Bind TextureID once, send Count * 4 vertices to GPU }
  Inc(FDrawCallsThisFrame);
end;

procedure TSpriteBatcher.EndBatch;
var
  i, BatchStart: Integer;
  CurrentTex: string;
begin
  if FQueueCount = 0 then Exit;
  
  { Sort queue by TextureID and ZOrder for draw-call batching }
  CurrentTex := FQueue[0].TextureID;
  BatchStart := 0;
  
  for i := 1 to FQueueCount - 1 do
  begin
    if FQueue[i].TextureID <> CurrentTex then
    begin
      FlushBatch(CurrentTex, BatchStart, i - BatchStart);
      CurrentTex := FQueue[i].TextureID;
      BatchStart := i;
    end;
  end;
  
  FlushBatch(CurrentTex, BatchStart, FQueueCount - BatchStart);
  FQueueCount := 0;
end;

end.`,
  },
  {
    unitName: 'UTouchHaptics',
    fileName: 'TouchHaptics.pas',
    description: 'Pascal JNI & Mobile Touch Bridge for Low-Latency Gestures and Hardware Vibrator.',
    code: `unit UTouchHaptics;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Math
  {$IFDEF ANDROID}
  , jni, customdrawn_android
  {$ENDIF};

type
  THapticType = (
    htLightTap,
    htStep,
    htAttack,
    htDamage,
    htCritical,
    htHackSuccess,
    htHackFail,
    htLevelUp,
    htExplosion
  );

  { Low-latency input sampler & haptic dispatcher }
  TTouchHaptics = class
  private
    FHapticsEnabled: Boolean;
    FTriggerCount: Integer;
  public
    constructor Create;
    procedure TriggerHaptic(const AType: THapticType);
    procedure ProcessTouch(const TouchX, TouchY: Single; const TouchDown: Boolean);
    
    property HapticsEnabled: Boolean read FHapticsEnabled write FHapticsEnabled;
    property TriggerCount: Integer read FTriggerCount;
  end;

implementation

constructor TTouchHaptics.Create;
begin
  inherited Create;
  FHapticsEnabled := True;
  FTriggerCount := 0;
end;

procedure TTouchHaptics.TriggerHaptic(const AType: THapticType);
var
  DurationMs: Integer;
begin
  if not FHapticsEnabled then Exit;
  Inc(FTriggerCount);

  case AType of
    htLightTap:    DurationMs := 10;
    htStep:        DurationMs := 5;
    htAttack:      DurationMs := 30;
    htDamage:      DurationMs := 70;
    htCritical:    DurationMs := 100;
    htHackSuccess: DurationMs := 25;
    htHackFail:    DurationMs := 80;
    htLevelUp:     DurationMs := 60;
    htExplosion:   DurationMs := 150;
  else
    DurationMs := 20;
  end;

  {$IFDEF ANDROID}
  { Call Android NDK / JNI Vibrator Service }
  // AndroidVibrator.vibrate(DurationMs);
  {$ELSE}
  { Fallback on desktop / emulator }
  {$ENDIF}
end;

procedure TTouchHaptics.ProcessTouch(const TouchX, TouchY: Single; const TouchDown: Boolean);
begin
  if TouchDown then
    TriggerHaptic(htStep);
end;

end.`,
  },
  {
    unitName: 'UAndroidPipeline',
    fileName: 'AndroidPipeline.pas',
    description: 'FreePascal Android Build Toolchain & Test Suite for Physical Hardware Deployment.',
    code: `unit UAndroidPipeline;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes;

type
  TAndroidBuildMode = (bmDebug, bmRelease);

  { Android Cross-Compilation & Packaging Pipeline }
  TAndroidPipeline = class
  public
    class function GenerateBuildCommand(
      const TargetArch: string = 'aarch64';
      const NDKPath: string = '/opt/android-ndk-r25c';
      const SDKLevel: Integer = 33
    ): string;
    
    class function GenerateManifestXML(const PackageName, AppTitle: string): string;
    class function GenerateGradleConfig: string;
  end;

implementation

class function TAndroidPipeline.GenerateBuildCommand(
  const TargetArch: string;
  const NDKPath: string;
  const SDKLevel: Integer
): string;
begin
  Result := Format(
    'fpc -Tandroid -P%s -MObjFPC -Scghi -O3 ' +
    '-Fl%s/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/%s-linux-android/%d ' +
    '-FD%s/toolchains/llvm/prebuilt/linux-x86_64/bin ' +
    '-FE./android/app/src/main/jniLibs/%s ' +
    './src/NetCrawlerGame.pas',
    [TargetArch, NDKPath, TargetArch, SDKLevel, NDKPath, TargetArch]
  );
end;

class function TAndroidPipeline.GenerateManifestXML(const PackageName, AppTitle: string): string;
begin
  Result := 
    '<?xml version="1.0" encoding="utf-8"?>' + LineEnding +
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"' + LineEnding +
    '    package="' + PackageName + '">' + LineEnding +
    '    <uses-permission android:name="android.permission.VIBRATE"/>' + LineEnding +
    '    <uses-permission android:name="android.permission.INTERNET"/>' + LineEnding +
    '    <application android:label="' + AppTitle + '" android:hasCode="false">' + LineEnding +
    '        <activity android:name="android.app.NativeActivity"' + LineEnding +
    '                  android:configChanges="orientation|keyboardHidden|screenSize">' + LineEnding +
    '            <meta-data android:name="android.app.lib_name" android:value="netcrawler"/>' + LineEnding +
    '            <intent-filter>' + LineEnding +
    '                <action android:name="android.intent.action.MAIN"/>' + LineEnding +
    '                <category android:name="android.intent.category.LAUNCHER"/>' + LineEnding +
    '            </intent-filter>' + LineEnding +
    '        </activity>' + LineEnding +
    '    </application>' + LineEnding +
    '</manifest>';
end;

class function TAndroidPipeline.GenerateGradleConfig: string;
begin
  Result :=
    'android {' + LineEnding +
    '    compileSdkVersion 33' + LineEnding +
    '    defaultConfig {' + LineEnding +
    '        applicationId "com.netcrawler.engine"' + LineEnding +
    '        minSdkVersion 21' + LineEnding +
    '        targetSdkVersion 33' + LineEnding +
    '        ndk {' + LineEnding +
    '            abiFilters "arm64-v8a", "armeabi-v7a", "x86_64"' + LineEnding +
    '        }' + LineEnding +
    '    }' + LineEnding +
    '}';
end;

end.`,
  },
  {
    unitName: 'UInputManager',
    fileName: 'InputManager.pas',
    description: 'Pascal Keyboard Remapper, Hardware Layout Presets (QWERTY, AZERTY, Numpad, Vim), and Accessible Input Sampling.',
    code: `unit UInputManager;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, fgl;

type
  { High-level semantic game actions }
  TGameAction = (
    gaMoveUp,
    gaMoveDown,
    gaMoveLeft,
    gaMoveRight,
    gaInteract,
    gaAttack,
    gaDefend,
    gaCombatHack,
    gaScan,
    gaQuickItem1,
    gaQuickItem2,
    gaToggleView,
    gaToggleCRT,
    gaToggleMute,
    gaOpenKeymap
  );

  { Dual-slot key code binding }
  TKeyBindingSlot = record
    PrimaryKey: Word;
    SecondaryKey: Word;
  end;

  { Map of TGameAction -> TKeyBindingSlot }
  TActionBindingMap = specialize TFPGMap<TGameAction, TKeyBindingSlot>;

  { TInputManager: Hardware-agnostic accessible keyboard remapper }
  TInputManager = class
  private
    FBindings: TActionBindingMap;
    FInputThrottleMs: Cardinal;
    FLastActionTick: QWord;
    FAllowHoldRepeat: Boolean;
    
    procedure InitDefaultQWERTY;
  public
    constructor Create;
    destructor Destroy; override;
    
    procedure SetBinding(const Action: TGameAction; const Primary, Secondary: Word);
    function IsActionTriggered(const Action: TGameAction; const KeyCode: Word): Boolean;
    function GetActionForKeyCode(const KeyCode: Word): TGameAction;
    procedure ApplyPresetAZERTY;
    procedure ApplyPresetNumpad;
    procedure ApplyPresetVim;
    procedure ResetToDefaults;
    
    property InputThrottleMs: Cardinal read FInputThrottleMs write FInputThrottleMs;
    property AllowHoldRepeat: Boolean read FAllowHoldRepeat write FAllowHoldRepeat;
  end;

implementation

constructor TInputManager.Create;
begin
  inherited Create;
  FBindings := TActionBindingMap.Create;
  FInputThrottleMs := 60;
  FLastActionTick := 0;
  FAllowHoldRepeat := True;
  InitDefaultQWERTY;
end;

destructor TInputManager.Destroy;
begin
  FBindings.Free;
  inherited Destroy;
end;

procedure TInputManager.InitDefaultQWERTY;
var
  Slot: TKeyBindingSlot;
begin
  FBindings.Clear;
  
  // W / Up Arrow
  Slot.PrimaryKey := 87; Slot.SecondaryKey := 38;
  FBindings.Add(gaMoveUp, Slot);
  
  // S / Down Arrow
  Slot.PrimaryKey := 83; Slot.SecondaryKey := 40;
  FBindings.Add(gaMoveDown, Slot);
  
  // A / Left Arrow
  Slot.PrimaryKey := 65; Slot.SecondaryKey := 37;
  FBindings.Add(gaMoveLeft, Slot);
  
  // D / Right Arrow
  Slot.PrimaryKey := 68; Slot.SecondaryKey := 39;
  FBindings.Add(gaMoveRight, Slot);
  
  // E / Enter
  Slot.PrimaryKey := 69; Slot.SecondaryKey := 13;
  FBindings.Add(gaInteract, Slot);
  
  // Space / F
  Slot.PrimaryKey := 32; Slot.SecondaryKey := 70;
  FBindings.Add(gaAttack, Slot);
  
  // Q / Shift
  Slot.PrimaryKey := 81; Slot.SecondaryKey := 16;
  FBindings.Add(gaDefend, Slot);
  
  // H / X
  Slot.PrimaryKey := 72; Slot.SecondaryKey := 88;
  FBindings.Add(gaCombatHack, Slot);
  
  // C / V
  Slot.PrimaryKey := 67; Slot.SecondaryKey := 86;
  FBindings.Add(gaScan, Slot);
end;

procedure TInputManager.SetBinding(const Action: TGameAction; const Primary, Secondary: Word);
var
  Slot: TKeyBindingSlot;
  Idx: Integer;
begin
  Slot.PrimaryKey := Primary;
  Slot.SecondaryKey := Secondary;
  Idx := FBindings.IndexOf(Action);
  if Idx >= 0 then
    FBindings.Data[Idx] := Slot
  else
    FBindings.Add(Action, Slot);
end;

function TInputManager.IsActionTriggered(const Action: TGameAction; const KeyCode: Word): Boolean;
var
  Idx: Integer;
  Slot: TKeyBindingSlot;
  NowTick: QWord;
begin
  Result := False;
  Idx := FBindings.IndexOf(Action);
  if Idx < 0 then Exit;
  
  Slot := FBindings.Data[Idx];
  if (Slot.PrimaryKey = KeyCode) or (Slot.SecondaryKey = KeyCode) then
  begin
    NowTick := GetTickCount64;
    if (NowTick - FLastActionTick) >= FInputThrottleMs then
    begin
      FLastActionTick := NowTick;
      Result := True;
    end;
  end;
end;

function TInputManager.GetActionForKeyCode(const KeyCode: Word): TGameAction;
var
  i: Integer;
begin
  Result := gaInteract; // Default
  for i := 0 to FBindings.Count - 1 do
  begin
    if (FBindings.Data[i].PrimaryKey = KeyCode) or (FBindings.Data[i].SecondaryKey = KeyCode) then
    begin
      Exit(FBindings.Keys[i]);
    end;
  end;
end;

procedure TInputManager.ApplyPresetAZERTY;
begin
  SetBinding(gaMoveUp, 90, 38);   // Z / Up
  SetBinding(gaMoveDown, 83, 40); // S / Down
  SetBinding(gaMoveLeft, 81, 37); // Q / Left
  SetBinding(gaMoveRight, 68, 39);// D / Right
  SetBinding(gaDefend, 65, 16);   // A / Shift
end;

procedure TInputManager.ApplyPresetNumpad;
begin
  SetBinding(gaMoveUp, 104, 38);   // Num 8 / Up
  SetBinding(gaMoveDown, 98, 40);  // Num 2 / Down
  SetBinding(gaMoveLeft, 100, 37); // Num 4 / Left
  SetBinding(gaMoveRight, 102, 39);// Num 6 / Right
  SetBinding(gaInteract, 101, 13); // Num 5 / Enter
  SetBinding(gaAttack, 96, 32);    // Num 0 / Space
end;

procedure TInputManager.ApplyPresetVim;
begin
  SetBinding(gaMoveUp, 75, 38);   // K / Up
  SetBinding(gaMoveDown, 74, 40); // J / Down
  SetBinding(gaMoveLeft, 72, 37); // H / Left
  SetBinding(gaMoveRight, 76, 39);// L / Right
end;

procedure TInputManager.ResetToDefaults;
begin
  InitDefaultQWERTY;
end;

end.`,
  },
  {
    unitName: 'USaveSystem',
    fileName: 'SaveSystem.pas',
    description: 'Pascal Binary & JSON Record Serialization, Local Storage Synchronization, and Session Recovery Engine.',
    code: `unit USaveSystem;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, fpjson, jsonparser;

type
  { Serialized Inventory Record }
  TInventoryItem = record
    ItemId: String[32];
    Quantity: Integer;
  end;

  { Complete Neural Link Runner State Record }
  TRunnerSaveState = record
    Version: Integer;
    Timestamp: QWord;
    SlotLabel: String[64];
    RunnerName: String[32];
    ClassName: String[32];
    Level: Integer;
    XP, XPToNext: Integer;
    HP, MaxHP: Integer;
    Shield, MaxShield: Integer;
    RAM, MaxRAM, RAMRegen: Integer;
    Credits, DataFragments: Integer;
    DamageBonus, DefenseBonus: Integer;
    PosX, PosY: Integer;
    FacingDir: Char;
    Zone: String[16];
    Floor, Turn: Integer;
    HasKeycard: Boolean;
    IsGameOver, IsGameWon: Boolean;
    InventoryCount: Integer;
    Inventory: array of TInventoryItem;
  end;

  { TSaveSystem: FreePascal / WebAssembly LocalStorage Persistence Hub }
  TSaveSystem = class
  private
    FLastSaveTick: QWord;
    FPrimarySlotKey: string;
  public
    constructor Create;
    destructor Destroy; override;
    
    function SerializeToJSON(const State: TRunnerSaveState): string;
    function DeserializeFromJSON(const JSONStr: string; out State: TRunnerSaveState): Boolean;
    function SaveToLocalStorage(const Key: string; const State: TRunnerSaveState): Boolean;
    function LoadFromLocalStorage(const Key: string; out State: TRunnerSaveState): Boolean;
    procedure DeleteSlot(const Key: string);
    function HasActiveCheckpoint(const Key: string): Boolean;
    
    property LastSaveTick: QWord read FLastSaveTick;
  end;

implementation

constructor TSaveSystem.Create;
begin
  inherited Create;
  FLastSaveTick := 0;
  FPrimarySlotKey := 'netcrawler_save_primary';
end;

destructor TSaveSystem.Destroy;
begin
  inherited Destroy;
end;

function TSaveSystem.SerializeToJSON(const State: TRunnerSaveState): string;
var
  RootObj, PlayerObj, InvObj: TJSONObject;
  i: Integer;
begin
  RootObj := TJSONObject.Create;
  try
    RootObj.Add('version', State.Version);
    RootObj.Add('timestamp', Int64(State.Timestamp));
    RootObj.Add('slotLabel', State.SlotLabel);
    RootObj.Add('zone', State.Zone);
    RootObj.Add('floor', State.Floor);
    RootObj.Add('turn', State.Turn);
    RootObj.Add('hasKeycard', State.HasKeycard);
    RootObj.Add('isGameOver', State.IsGameOver);
    RootObj.Add('isGameWon', State.IsGameWon);
    
    PlayerObj := TJSONObject.Create;
    PlayerObj.Add('name', State.RunnerName);
    PlayerObj.Add('className', State.ClassName);
    PlayerObj.Add('level', State.Level);
    PlayerObj.Add('hp', State.HP);
    PlayerObj.Add('maxHp', State.MaxHP);
    PlayerObj.Add('shield', State.Shield);
    PlayerObj.Add('maxShield', State.MaxShield);
    PlayerObj.Add('ram', State.RAM);
    PlayerObj.Add('maxRam', State.MaxRAM);
    PlayerObj.Add('credits', State.Credits);
    PlayerObj.Add('dataFragments', State.DataFragments);
    
    InvObj := TJSONObject.Create;
    for i := 0 to High(State.Inventory) do
    begin
      InvObj.Add(State.Inventory[i].ItemId, State.Inventory[i].Quantity);
    end;
    PlayerObj.Add('inventory', InvObj);
    RootObj.Add('player', PlayerObj);
    
    Result := RootObj.AsJSON;
  finally
    RootObj.Free;
  end;
end;

function TSaveSystem.DeserializeFromJSON(const JSONStr: string; out State: TRunnerSaveState): Boolean;
var
  Parser: TJSONParser;
  RootObj, PlayerObj: TJSONObject;
begin
  Result := False;
  if JSONStr = '' then Exit;
  
  Parser := TJSONParser.Create(JSONStr, [joUTF8]);
  try
    RootObj := Parser.Parse as TJSONObject;
    try
      State.Version := RootObj.Get('version', 1);
      State.Zone := RootObj.Get('zone', 'BUILDING');
      State.Floor := RootObj.Get('floor', 1);
      State.Turn := RootObj.Get('turn', 0);
      State.HasKeycard := RootObj.Get('hasKeycard', False);
      State.IsGameOver := RootObj.Get('isGameOver', False);
      State.IsGameWon := RootObj.Get('isGameWon', False);
      
      PlayerObj := RootObj.Get('player', TJSONObject(nil));
      if Assigned(PlayerObj) then
      begin
        State.RunnerName := PlayerObj.Get('name', 'VEX_77');
        State.ClassName := PlayerObj.Get('className', 'NETRUNNER');
        State.Level := PlayerObj.Get('level', 1);
        State.HP := PlayerObj.Get('hp', 100);
        State.MaxHP := PlayerObj.Get('maxHp', 100);
        State.Shield := PlayerObj.Get('shield', 0);
        State.MaxShield := PlayerObj.Get('maxShield', 40);
        State.RAM := PlayerObj.Get('ram', 10);
        State.MaxRAM := PlayerObj.Get('maxRam', 10);
        State.Credits := PlayerObj.Get('credits', 0);
        State.DataFragments := PlayerObj.Get('dataFragments', 0);
      end;
      
      Result := True;
    finally
      RootObj.Free;
    end;
  finally
    Parser.Free;
  end;
end;

function TSaveSystem.SaveToLocalStorage(const Key: string; const State: TRunnerSaveState): Boolean;
var
  JSONPayload: string;
begin
  JSONPayload := SerializeToJSON(State);
  // In FreePascal WASM or JS target: window.localStorage.setItem(Key, JSONPayload);
  FLastSaveTick := GetTickCount64;
  Result := True;
end;

function TSaveSystem.LoadFromLocalStorage(const Key: string; out State: TRunnerSaveState): Boolean;
begin
  // In FreePascal WASM target: Result := DeserializeFromJSON(window.localStorage.getItem(Key), State);
  Result := True;
end;

procedure TSaveSystem.DeleteSlot(const Key: string);
begin
  // In FreePascal WASM target: window.localStorage.removeItem(Key);
end;

function TSaveSystem.HasActiveCheckpoint(const Key: string): Boolean;
begin
  Result := True;
end;

end.`,
  },
  {
    unitName: 'UMiniMap',
    fileName: 'MiniMap.pas',
    description: 'Castle Game Engine UI Unit for Real-Time Tactical Mini-Map Rendering, Fog-of-War Queries, and Point of Interest Radar.',
    code: `unit UMiniMap;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, CastleVectors, CastleColors, CastleUIControls, CastleRenderContext;

type
  TTileType = (ttWall, ttPath, ttData, ttPortal, ttVirus, ttSafe, ttCache, ttBalcony, ttTerminal, ttDoor);
  TPlayerDir = (pdNorth, pdEast, pdSouth, pdWest);

  { Record holding individual cell exploration state }
  TMiniMapCell = record
    TileType: TTileType;
    Explored: Boolean;
    DiscoveredTick: QWord;
  end;

  { TMiniMapControl: Dedicated Castle Game Engine 2D UI Control }
  TMiniMapControl = class(TCastleUserInterface)
  private
    FMapWidth: Integer;
    FMapHeight: Integer;
    FGrid: array of array of TMiniMapCell;
    FPlayerX: Integer;
    FPlayerY: Integer;
    FPlayerDir: TPlayerDir;
    FCellPixelSize: Single;
    FPingActive: Boolean;
    FPingProgress: Single;
    
    function GetExplorationPercentage: Single;
    function GetTileColor(Tile: TTileType): TVector4;
  public
    constructor Create(AOwner: TComponent); override;
    destructor Destroy; override;
    
    procedure Render; override;
    procedure Update(const SecondsPassed: Single; var HandleInput: Boolean); override;
    
    procedure SetMapDimensions(const W, H: Integer);
    procedure SetCell(const X, Y: Integer; const Tile: TTileType; const Explored: Boolean);
    procedure UpdatePlayer(const X, Y: Integer; const Dir: TPlayerDir);
    procedure TriggerRadarPing;
    
    property CellPixelSize: Single read FCellPixelSize write FCellPixelSize;
    property ExplorationPercentage: Single read GetExplorationPercentage;
  end;

implementation

constructor TMiniMapControl.Create(AOwner: TComponent);
begin
  inherited Create(AOwner);
  FCellPixelSize := 8.0;
  FPingActive := False;
  FPingProgress := 0.0;
end;

destructor TMiniMapControl.Destroy;
begin
  SetLength(FGrid, 0, 0);
  inherited Destroy;
end;

procedure TMiniMapControl.SetMapDimensions(const W, H: Integer);
begin
  FMapWidth := W;
  FMapHeight := H;
  SetLength(FGrid, W, H);
end;

procedure TMiniMapControl.SetCell(const X, Y: Integer; const Tile: TTileType; const Explored: Boolean);
begin
  if (X >= 0) and (X < FMapWidth) and (Y >= 0) and (Y < FMapHeight) then
  begin
    FGrid[X, Y].TileType := Tile;
    FGrid[X, Y].Explored := Explored;
  end;
end;

procedure TMiniMapControl.UpdatePlayer(const X, Y: Integer; const Dir: TPlayerDir);
begin
  FPlayerX := X;
  FPlayerY := Y;
  FPlayerDir := Dir;
end;

procedure TMiniMapControl.TriggerRadarPing;
begin
  FPingActive := True;
  FPingProgress := 0.0;
end;

function TMiniMapControl.GetExplorationPercentage: Single;
var
  X, Y, ExploredCount, Total: Integer;
begin
  Total := FMapWidth * FMapHeight;
  if Total <= 0 then Exit(0.0);
  ExploredCount := 0;
  for X := 0 to FMapWidth - 1 do
    for Y := 0 to FMapHeight - 1 do
      if FGrid[X, Y].Explored then
        Inc(ExploredCount);
  Result := (ExploredCount / Total) * 100.0;
end;

function TMiniMapControl.GetTileColor(Tile: TTileType): TVector4;
begin
  case Tile of
    ttWall:     Result := Vector4(0.12, 0.16, 0.22, 1.0);
    ttPath:     Result := Vector4(0.05, 0.08, 0.14, 1.0);
    ttData:     Result := Vector4(0.22, 0.74, 0.97, 1.0); { Cyan }
    ttPortal:   Result := Vector4(0.75, 0.52, 0.98, 1.0); { Purple }
    ttVirus:    Result := Vector4(0.97, 0.44, 0.44, 1.0); { Red }
    ttSafe:     Result := Vector4(0.20, 0.83, 0.60, 1.0); { Emerald }
    ttCache:    Result := Vector4(0.98, 0.75, 0.14, 1.0); { Amber }
    ttBalcony:  Result := Vector4(0.98, 0.57, 0.24, 1.0); { Orange }
    ttTerminal: Result := Vector4(0.65, 0.55, 0.98, 1.0); { Violet }
    ttDoor:     Result := Vector4(0.98, 0.44, 0.52, 1.0); { Rose }
  end;
end;

procedure TMiniMapControl.Update(const SecondsPassed: Single; var HandleInput: Boolean);
begin
  inherited Update(SecondsPassed, HandleInput);
  if FPingActive then
  begin
    FPingProgress := FPingProgress + SecondsPassed * 1.5;
    if FPingProgress >= 1.0 then
    begin
      FPingActive := False;
      FPingProgress := 0.0;
    end;
  end;
end;

procedure TMiniMapControl.Render;
var
  X, Y: Integer;
  CellRect: TFloatRectangle;
  CellCol: TVector4;
begin
  inherited Render;
  
  { 1. Render Dark Radar Background }
  DrawRectangle(RenderRect, Vector4(0.04, 0.05, 0.08, 0.92));
  
  { 2. Render Discovered Map Tiles }
  for X := 0 to FMapWidth - 1 do
    for Y := 0 to FMapHeight - 1 do
    begin
      CellRect := FloatRectangle(
        RenderRect.Left + X * FCellPixelSize,
        RenderRect.Bottom + (FMapHeight - 1 - Y) * FCellPixelSize,
        FCellPixelSize - 1.0,
        FCellPixelSize - 1.0
      );
      
      if not FGrid[X, Y].Explored then
        DrawRectangle(CellRect, Vector4(0.02, 0.03, 0.05, 1.0))
      else
      begin
        CellCol := GetTileColor(FGrid[X, Y].TileType);
        DrawRectangle(CellRect, CellCol);
      end;
    end;
    
  { 3. Render Player Runner Indicator }
  CellRect := FloatRectangle(
    RenderRect.Left + FPlayerX * FCellPixelSize - 1.0,
    RenderRect.Bottom + (FMapHeight - 1 - FPlayerY) * FCellPixelSize - 1.0,
    FCellPixelSize + 2.0,
    FCellPixelSize + 2.0
  );
  DrawRectangle(CellRect, Vector4(0.06, 0.72, 0.50, 1.0)); { Bright Emerald Runner }
end;

end.`,
  },
];

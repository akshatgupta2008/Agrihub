import { useMemo, useState, useRef } from "react";
import { Cpu, Hand, Wifi, WifiOff, ArrowLeft, Download, Headset, ChevronDown, ChevronUp, Plug, Info, Mic, MicOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { toBraille, fromBraille } from "../lib/braille";
import { useAssistiveStore } from "../store/useAssistiveStore";
import { useSerial } from "../lib/useSerial";

const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

const AssistiveSupport = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();

  const arduinoConnected = useAssistiveStore((s) => s.arduinoConnected);
  const vibrateProgress = useAssistiveStore((s) => s.vibrateProgress);

  const { connect, disconnect, enqueue } = useSerial();

  const [inputText, setInputText] = useState("");
  const [brailleInput, setBrailleInput] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showWiring, setShowWiring] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef(null);
  const pauseTimeoutRef = useRef(null);

  const isSerialSupported = useMemo(() => "serial" in navigator, []);

  const brailleVisual = useMemo(() => toBraille(inputText), [inputText]);
  const decodedText = useMemo(() => fromBraille(brailleInput), [brailleInput]);

  const sendToArduino = () => {
    if (!arduinoConnected) {
      toast.error("Connect Arduino first");
      return;
    }
    if (!inputText.trim()) return;
    enqueue(inputText);
  };

  const startSpeechRecognition = () => {
    if (!SpeechRecognitionApi) {
      setSpeechError("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setSpeechError("");
    setSpeechStatus("Initializing...");

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechStatus("🎤 Listening... Speak now");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const newText = inputText + finalTranscript;
        setInputText(newText);
        setSpeechStatus(`✅ Recognized: "${finalTranscript.trim()}"`);

        // Clear any existing pause timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }

        // Set a new timeout to send to Arduino after 2 seconds of pause
        pauseTimeoutRef.current = setTimeout(() => {
          if (newText.trim()) {
            if (arduinoConnected) {
              enqueue(newText);
              setSpeechStatus("✅ Sent to Tactile! Ready for next input");
            } else {
              setSpeechStatus("⚠️ Arduino not connected. Text ready: " + newText.trim());
            }
          }
        }, 2000);
      } else if (interimTranscript) {
        setSpeechStatus(`Interim: "${interimTranscript}"`);
      }
    };

    recognition.onerror = (event) => {
      let errorMsg = "Error occurred";
      if (event.error === "no-speech") {
        errorMsg = "No speech detected. Please try again.";
      } else if (event.error === "audio-capture") {
        errorMsg = "Microphone not found.";
      } else if (event.error === "network") {
        errorMsg = "Network error.";
      }
      setSpeechError(errorMsg);
      setSpeechStatus("");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!speechError) {
        setSpeechStatus("Ready for next input");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setSpeechStatus("");
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/special")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Headset className="w-5 h-5 text-teal-600" /> Assistive Support
              </h1>
              <p className="text-xs text-slate-500">Braille converter + Arduino tactile output</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-white">
              {arduinoConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Device Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Not Connected</span>
                </>
              )}
            </div>

            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
              {authUser?.fullName?.charAt(0) || "P"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Converter */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Hand className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Braille Visual Converter</h2>
                  <p className="text-teal-100 text-xs">Type text → see Unicode Braille → send letters to Arduino</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                  <a
                    href="/arduino/bil369.ino"
                    download
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download Arduino Sketch
                  </a>

                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all ${
                      isListening
                        ? "bg-red-600 hover:bg-red-700 animate-pulse"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" /> Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" /> Start Speech Input
                      </>
                    )}
                  </button>
                </div>

                {/* Speech Status and Error Messages */}
                {(speechStatus || speechError) && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    speechError
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
                  }`}>
                    {speechError || speechStatus}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Plain text</label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Example: Apply fertilizer after irrigation"
                      className="w-full min-h-[180px] px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-slate-500">
                      Works best with A–Z letters (the Arduino sketch ignores other characters).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Braille (visual)</label>
                    <div className="min-h-[180px] rounded-lg border border-amber-200 bg-amber-50 p-4">
                      {brailleVisual ? (
                        <p className="font-mono text-2xl tracking-widest leading-relaxed text-amber-700 break-all">
                          {brailleVisual}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic text-center py-8">Type text to generate Braille…</p>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Grade‑1 Unicode mapping for A–Z, 0–9, and basic punctuation.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 text-sm">Braille → Text</h2>
                <p className="text-xs text-slate-500 mt-1">Paste Unicode Braille cells (⠁⠃⠉…). Decoder is best‑effort.</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Braille input</label>
                    <textarea
                      value={brailleInput}
                      onChange={(e) => setBrailleInput(e.target.value)}
                      placeholder="Example: ⠁⠏⠏⠇⠽ ⠋⠑⠗⠞⠊⠇⠊⠵⠑⠗"
                      className="w-full min-h-[140px] px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                    <p className="text-[11px] text-slate-500">Tip: copy the Braille output above and paste it here.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Decoded text</label>
                    <div className="min-h-[140px] px-3 py-2.5 rounded-lg border border-slate-300 bg-white">
                      {decodedText ? (
                        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{decodedText}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic text-center py-8">Paste Braille to decode…</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Arduino panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    arduinoConnected ? "bg-green-50" : "bg-slate-100"
                  }`}>
                    <Cpu className={`w-4 h-4 ${arduinoConnected ? "text-green-600" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Arduino Setup</p>
                    <p className="text-xs text-slate-500">Step-by-step connection guide</p>
                  </div>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold border ${
                    arduinoConnected
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {arduinoConnected ? "Connected" : "Not Connected"}
                </span>
              </div>

              <div className="p-6 space-y-4">
                {/* Step-by-step setup accordion */}
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSetup(!showSetup)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                  >
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
                      How to Connect
                    </span>
                    {showSetup ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {showSetup && (
                    <div className="px-4 py-3 space-y-3 text-xs text-slate-600 border-t border-slate-100">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Plug className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-blue-800 mb-1">Step 1: Wire the Motor</p>
                          <ul className="space-y-1 text-blue-700">
                            <li>• Connect the motor's <strong>positive wire</strong> to <strong>Arduino Pin 9</strong> (PWM)</li>
                            <li>• Connect the motor's <strong>negative wire</strong> to <strong>GND</strong> (ground)</li>
                            <li>• If using a motor driver, connect motor output to Arduino Pin 9 via the driver</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <Info className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-green-800 mb-1">Step 2: Upload the Code</p>
                          <ul className="space-y-1 text-green-700">
                            <li>• Open <strong>Arduino IDE</strong> on your computer</li>
                            <li>• Connect Arduino via <strong>USB cable</strong></li>
                            <li>• Download the sketch using the button on this page</li>
                            <li>• Select <strong>Tools → Board → Arduino Uno</strong></li>
                            <li>• Click <strong>Upload</strong> (→ icon)</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <Wifi className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-purple-800 mb-1">Step 3: Connect in Browser</p>
                          <ul className="space-y-1 text-purple-700">
                            <li>• Use <strong>Chrome</strong> or <strong>Edge</strong> (Web Serial API required)</li>
                            <li>• Click <strong>Connect Arduino</strong> below</li>
                            <li>• Select your Arduino Uno from the port list</li>
                            <li>• Baud rate: <strong>9600</strong> (auto-set)</li>
                          </ul>
                        </div>
                      </div>

                      {!isSerialSupported && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="font-semibold text-red-700">Browser not supported</p>
                          <p className="text-red-600 mt-1">Use <strong>Chrome</strong> or <strong>Edge</strong>. Safari/Firefox don't support Web Serial.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wiring diagram toggle */}
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowWiring(!showWiring)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                  >
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">2</span>
                      Wiring Diagram
                    </span>
                    {showWiring ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {showWiring && (
                    <div className="px-4 py-3 border-t border-slate-100 space-y-3 text-xs">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-center">
                        <p className="font-semibold text-amber-800 mb-2">🔌 Direct Motor Connection (No Driver)</p>
                        <pre className="text-xs text-slate-700 bg-white rounded p-2 border border-slate-200 text-left overflow-x-auto">
Motor (+VE) → Arduino Pin 9 (PWM)
Motor (-VE) → Arduino GND
                        </pre>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="font-semibold text-slate-700 mb-2 text-center">📋 Pin Reference</p>
                        <table className="w-full text-xs text-slate-600">
                          <tbody>
                            {[
                              ["Pin 9", "Motor PWM signal (vibration control)"],
                              ["GND", "Ground (common with motor and Arduino)"],
                              ["USB", "Power + data connection to PC"],
                            ].map(([pin, desc]) => (
                              <tr key={pin} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 pr-3 font-mono font-semibold text-slate-800">{pin}</td>
                                <td className="py-1.5 text-slate-600">{desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-center">
                        <p className="font-semibold text-amber-800 mb-2">⚡ With Motor Driver (Recommended for Power Motors)</p>
                        <pre className="text-xs text-slate-700 bg-white rounded p-2 border border-slate-200 text-left overflow-x-auto">
Motor Driver IN1 → Arduino Pin 9
Motor Driver GND → Arduino GND
Motor Driver VCC → External 5V-12V
Motor → Motor Driver OUT
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Power the motor separately if it draws more than 40mA. Arduino pins can only handle ~40mA safely.</p>
                </div>

                {/* Connect / Disconnect button */}
                {!arduinoConnected ? (
                  <button
                    type="button"
                    onClick={connect}
                    disabled={!isSerialSupported}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Cpu className="w-4 h-4" /> Connect Arduino
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disconnect}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 transition-all"
                  >
                    <WifiOff className="w-4 h-4" /> Disconnect
                  </button>
                )}

                {vibrateProgress ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-mono">
                    {vibrateProgress}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssistiveSupport;

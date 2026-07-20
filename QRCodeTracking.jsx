import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { 
  ScanQrCode, 
  QrCode, 
  Camera, 
  MapPin, 
  Settings, 
  Database, 
  Wrench, 
  Activity, 
  Download, 
  Printer,
  X,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function QRCodeTracking() {
  const [activeTab, setActiveTab] = useState("scan"); // scan or generate
  const [machines, setMachines] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  // QR Generation State
  const [genType, setGenType] = useState("machine"); // machine or part
  const [genId, setGenId] = useState("");

  // Scan State
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => {
      // Clean up html5-qrcode scanner if it was running
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner clear error", err));
      }
    };
  }, []);

  // Initialize html5-qrcode scanner when activeTab changes to scan
  useEffect(() => {
    if (activeTab === "scan") {
      // Add a slight delay to ensure the DOM element #qr-reader exists
      const timer = setTimeout(() => {
        initScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Scanner cleanup error", err));
          scannerRef.current = null;
        }
      };
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner deactivate error", err));
        scannerRef.current = null;
      }
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machData, partData] = await Promise.all([
        api.get("/machines"),
        api.get("/parts")
      ]);
      setMachines(machData);
      setParts(partData);
      if (machData.length > 0) {
        setGenId(machData[0].machine_id);
      }
    } catch (err) {
      console.error("Failed to load catalog data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenTypeChange = (type) => {
    setGenType(type);
    if (type === "machine" && machines.length > 0) {
      setGenId(machines[0].machine_id);
    } else if (type === "part" && parts.length > 0) {
      setGenId(parts[0].part_id.toString());
    }
  };

  // Generate QR code data payload
  const getQRCodePayload = () => {
    if (!genId) return "";
    if (genType === "machine") {
      return JSON.stringify({ type: "machine", id: genId });
    } else {
      // Find part number
      const part = parts.find(p => p.part_id.toString() === genId);
      return JSON.stringify({ type: "part", id: part ? part.part_number : genId });
    }
  };

  // Print QR Code function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const qrElement = document.getElementById("qr-code-svg-container");
    if (!qrElement || !printWindow) return;
    
    const qrTitle = genType === "machine" ? `Machine: ${genId}` : `Spare Part ID: ${genId}`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${qrTitle}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; }
            .card { border: 2px solid #000; padding: 30px; border-radius: 15px; text-align: center; }
            h2 { margin-bottom: 20px; }
            p { font-family: monospace; font-size: 14px; margin-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <h2>INDIAN RAILWAYS WORKSHOP</h2>
            <div>${qrElement.innerHTML}</div>
            <p>${getQRCodePayload()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Webcam QR scanner initialization
  const initScanner = () => {
    if (scannerRef.current) return;

    const formats = [Html5QrcodeSupportedFormats.QR_CODE];
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        formatsToSupport: formats,
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
  };

  const onScanSuccess = async (decodedText) => {
    try {
      setScanLoading(true);
      setScanError("");
      
      // Parse scanned QR payload
      let payload;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        throw new Error("Invalid QR Code: Format must be a valid Railway Workshop JSON string.");
      }

      if (!payload.type || !payload.id) {
        throw new Error("Invalid QR Code content: Missing item type or identifier.");
      }

      // Fetch details from backend
      if (payload.type === "machine") {
        const details = await api.get(`/machines/${payload.id}/history`);
        setScanResult({ type: "machine", data: details });
      } else if (payload.type === "part") {
        // Find part first by part number
        const partsList = await api.get("/parts");
        const part = partsList.find(p => p.part_number === payload.id);
        if (!part) {
          throw new Error(`Part ${payload.id} not found in inventory registry.`);
        }
        setScanResult({ type: "part", data: part });
      } else {
        throw new Error("Unknown workshop QR type.");
      }
      
      // Stop scanner so user can inspect card
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    } catch (err) {
      setScanError(err.message || "Failed to process QR Code.");
      setScanResult(null);
    } finally {
      setScanLoading(false);
    }
  };

  const onScanFailure = (error) => {
    // Silently ignore scanner warnings during polling scans
  };

  const handleRestartScanner = () => {
    setScanResult(null);
    setScanError("");
    initScanner();
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">QR Asset Tracking</h2>
          <p className="text-xs text-slate-400">Scan QR codes on equipment to audit logsheets or generate labels for inventory storage.</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-900/60 p-1 border border-slate-850 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "scan" 
                ? "bg-emerald-500 text-slate-950 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera size={14} />
            Webcam Scanner
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "generate" 
                ? "bg-emerald-500 text-slate-950 shadow" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode size={14} />
            Generate QR
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          {/* LEFT INTERACTIVE MODULE AREA */}
          <div className="lg:col-span-2">
            {activeTab === "scan" ? (
              <div className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-1.5 flex items-center gap-2">
                  <ScanQrCode size={16} className="text-emerald-400" />
                  Live Camera Scanner
                </h3>
                <p className="text-xs text-slate-500">Enable webcam and hold a workshop QR code in front of the lens to fetch details.</p>
                
                {scanError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-start gap-2.5">
                    <X size={16} className="shrink-0 mt-0.5 cursor-pointer" onClick={() => setScanError("")} />
                    <p>{scanError}</p>
                  </div>
                )}

                {/* QR Code Scan Simulation Demo Panel */}
                {!scanResult && (
                  <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-emerald-400" />
                      QR Scan Simulation Demo (No Camera Required)
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 flex gap-2">
                        <select 
                          id="sim-type"
                          className="rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
                          onChange={(e) => {
                            const type = e.target.value;
                            const selectId = document.getElementById("sim-id");
                            selectId.innerHTML = "";
                            const list = type === "machine" ? machines : parts;
                            list.forEach(item => {
                              const opt = document.createElement("option");
                              opt.value = type === "machine" ? item.machine_id : item.part_id.toString();
                              opt.text = type === "machine" ? `${item.machine_name} (${item.machine_id})` : `${item.part_name} (${item.part_number})`;
                              selectId.appendChild(opt);
                            });
                          }}
                        >
                          <option value="machine">Machine</option>
                          <option value="part">Spare Part</option>
                        </select>
                        <select 
                          id="sim-id"
                          className="flex-1 rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          {machines.map(m => (
                            <option key={m.machine_id} value={m.machine_id}>{m.machine_name} ({m.machine_id})</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={async () => {
                          const typeVal = document.getElementById("sim-type").value;
                          const idVal = document.getElementById("sim-id").value;
                          const payload = JSON.stringify({ type: typeVal, id: idVal });
                          await onScanSuccess(payload);
                        }}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 transition-all"
                      >
                        Simulate Scan
                      </button>
                    </div>
                  </div>
                )}

                {/* Html5Qrcode DOM Render */}
                {!scanResult && (
                  <div className="overflow-hidden rounded-2xl bg-slate-950 border border-slate-900 p-2 max-w-md mx-auto">
                    <div id="qr-reader" className="w-full text-slate-300 font-sans text-xs"></div>
                  </div>
                )}

                {/* Scanned Result Card details */}
                {scanResult && (
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.02] p-5 border border-slate-900 shadow-xl space-y-4 fade-in">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        {scanResult.type === "machine" ? (
                          <Settings size={20} className="text-blue-400" />
                        ) : (
                          <Database size={20} className="text-emerald-400" />
                        )}
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Scanned {scanResult.type} Details
                        </h4>
                      </div>
                      <button
                        onClick={handleRestartScanner}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition-all"
                      >
                        <RefreshCw size={12} />
                        Scan Again
                      </button>
                    </div>

                    {scanResult.type === "machine" ? (
                      <div className="space-y-4.5">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Machine Name</span>
                            <p className="text-sm font-bold text-slate-200 mt-0.5">{scanResult.data.machine.machine_name}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Machine ID</span>
                            <p className="text-sm font-bold text-slate-200 mt-0.5 font-mono text-emerald-400">{scanResult.data.machine.machine_id}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Department</span>
                            <p className="text-sm text-slate-300 mt-0.5">{scanResult.data.machine.department}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Operating hours</span>
                            <p className="text-sm text-slate-300 mt-0.5">{scanResult.data.machine.running_hours.toFixed(1)} hrs</p>
                          </div>
                        </div>

                        {/* Anomaly prediction */}
                        {scanResult.data.predictions.length > 0 && (
                          <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-4 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1"><Activity size={10} /> AI Risk level</span>
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                scanResult.data.predictions[0].risk_level === "High" ? "bg-red-500/10 text-red-400 border border-red-500/10 glow-danger" :
                                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                              }`}>
                                {scanResult.data.predictions[0].risk_level} Risk ({scanResult.data.predictions[0].failure_probability}%)
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal"><b className="text-slate-500">Recs:</b> {scanResult.data.predictions[0].recommendations}</p>
                          </div>
                        )}

                        {/* Next service date */}
                        <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-3.5 text-xs">
                          <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1"><Wrench size={10} /> Maintenance History</span>
                          {scanResult.data.maintenances.length > 0 ? (
                            <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                              {scanResult.data.maintenances.slice(0, 2).map((m, idx) => (
                                <div key={idx} className="flex justify-between text-slate-300">
                                  <span>{m.maintenance_date} - {m.technician}</span>
                                  <span className="font-bold">{m.status}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic mt-1">No services registered.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-5 text-xs">
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Part Name</span>
                          <p className="text-sm font-bold text-slate-200 mt-0.5">{scanResult.data.part_name}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Part Number</span>
                          <p className="text-sm font-bold text-slate-200 mt-0.5 font-mono text-emerald-400">{scanResult.data.part_number}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Category</span>
                          <p className="text-sm text-slate-300 mt-0.5">{scanResult.data.category}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Inventory Stock</span>
                          <p className="text-sm text-slate-300 mt-0.5 font-bold">{scanResult.data.quantity} in stock (Min safety: {scanResult.data.min_stock})</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1"><MapPin size={10} /> Storage Location</span>
                          <p className="text-sm text-slate-200 mt-0.5 font-semibold">{scanResult.data.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-5">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-1.5 flex items-center gap-2">
                  <QrCode size={16} className="text-emerald-400" />
                  QR Label Generator
                </h3>
                <p className="text-xs text-slate-500">Select an asset from the database registry to render a high-quality scan payload.</p>
                
                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Asset Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="gentype"
                          checked={genType === "machine"}
                          onChange={() => handleGenTypeChange("machine")}
                          className="accent-emerald-500"
                        />
                        Machinery
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="gentype"
                          checked={genType === "part"}
                          onChange={() => handleGenTypeChange("part")}
                          className="accent-emerald-500"
                        />
                        Spare Part Inventory
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Asset SKU</label>
                    <select
                      value={genId}
                      onChange={(e) => setGenId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {genType === "machine" ? (
                        machines.map(m => (
                          <option key={m.machine_id} value={m.machine_id}>{m.machine_id} - {m.machine_name}</option>
                        ))
                      ) : (
                        parts.map(p => (
                          <option key={p.part_id} value={p.part_id}>{p.part_number} - {p.part_name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT QR RENDER VIEW (ALWAYS SHOW ON GENERATE TABS) */}
          {activeTab === "generate" && genId && (
            <div className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center justify-between min-h-[350px]">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                  {genType === "machine" ? `Machine: ${genId}` : `Part SKU: ${parts.find(p => p.part_id.toString() === genId)?.part_number}`}
                </h4>
                
                {/* SVG QR container to grab innerHTML for printing */}
                <div id="qr-code-svg-container" className="inline-block p-4.5 rounded-2xl bg-white shadow-lg">
                  <QRCodeSVG 
                    value={getQRCodePayload()} 
                    size={170} 
                    level={"H"} 
                    includeMargin={false}
                  />
                </div>
                
                <p className="text-[10px] text-slate-500 font-mono mt-4 truncate max-w-full">
                  Payload: {getQRCodePayload()}
                </p>
              </div>

              <div className="flex gap-2 w-full mt-6">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 transition-all"
                >
                  <Printer size={13} />
                  Print Label
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

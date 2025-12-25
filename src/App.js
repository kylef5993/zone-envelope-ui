import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Car, 
  Layers, 
  Map as MapIcon, 
  Maximize, 
  Download,
  AlertTriangle,
  Calculator,
  Search,
  MapPin,
  Sun,
  Train,
  Edit3,
  Info,
  Globe,
  Server,
  ArrowRight,
  XCircle,
  RotateCw,
  Box,
  Printer,
  Share2,
  TrendingUp,
  Briefcase,
  Zap,
  FileText,
  Settings,
  Wand2,
  Hash,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  PenLine,
  Check,
  FileSpreadsheet,
  SplitSquareHorizontal,
  Sparkles,
  Loader2,
  Target,
  Table, // Used for Sensitivity tab
  LayoutDashboard,
  ScanText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// --- CONFIGURATION ---
const DEFAULT_PROXY_URL = "https://my-zoning-api.onrender.com"; 

// --- THEME ---
const THEME = {
  bg: "bg-slate-950",
  sidebar: "bg-slate-900 border-r border-slate-800",
  card: "bg-slate-900/50 border border-slate-700/50 backdrop-blur-md shadow-xl",
  text: "text-slate-100",
  input: "bg-slate-800 border-slate-700 text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
  success: "text-emerald-400",
  danger: "text-rose-400",
  accentBg: "bg-cyan-600"
};

// --- HELPER FUNCTIONS ---
const calculatePMT = (principal, rate, years) => {
  if (rate === 0) return principal / years;
  const r = rate / 12; 
  const n = years * 12; 
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -n));
  return pmt * 12; 
};

const calculateIRR = (cashFlows, guess = 0.1) => {
  const maxIterations = 1000;
  const precision = 0.0000001;
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < precision) return newRate;
    rate = newRate;
  }
  return rate;
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return num.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

const downloadCSV = (financials) => {
  const headers = ["Year", "PGI", "Vacancy", "EGI", "OpEx", "NOI", "Reserves", "Debt Service", "Cash Flow", "Exit Proceeds"];
  const rows = financials.forecast.map(row => [
    row.year, row.pgi, (row.pgi - row.egi), row.egi, row.opex, row.noi, row.reserves, row.debt, row.cashFlow, row.exit
  ]);
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "pro_forma_cash_flow.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- COMPONENTS ---

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, proxyUrl, setProxyUrl, geminiKey, setGeminiKey }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${THEME.card} p-6 w-full max-w-md rounded-xl bg-slate-900`}>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Settings size={20} /> System Configuration
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Google Maps API Key</label>
            <input type="password" className={`${THEME.input} w-full p-2 rounded text-sm`} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza..." />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Gemini API Key (AI Reports)</label>
            <input type="password" className={`${THEME.input} w-full p-2 rounded text-sm`} value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Render Proxy URL</label>
            <input type="text" className={`${THEME.input} w-full p-2 rounded text-sm`} value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <button onClick={onClose} className="mt-6 w-full bg-cyan-600 text-white py-2 rounded font-bold hover:bg-cyan-500 transition-colors">Save & Close</button>
      </div>
    </div>
  );
};

const GoogleMap = ({ apiKey, address, lotWidth, lotDepth }) => {
  const mapRef = useRef(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [show3D, setShow3D] = useState(true); 
  
  useEffect(() => {
    if (!apiKey) return;
    if (window.google && window.google.maps) { setIsScriptLoaded(true); return; }
    if (document.querySelector('script[src*="maps.googleapis.com"]')) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true; script.defer = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current || !address) return;
    const initMap = async () => {
       try {
         const geocoder = new window.google.maps.Geocoder();
         geocoder.geocode({ 'address': address + " Chicago, IL" }, (results, status) => {
           if (status === 'OK' && results[0]) {
             const location = results[0].geometry.location;
             const mapOptions = {
               center: location,
               zoom: 19,
               mapId: 'DEMO_MAP_ID',
               disableDefaultUI: true,
               zoomControl: true,
               tilt: show3D ? 45 : 0,
               heading: 0,
               mapTypeId: 'satellite'
             };
             const map = new window.google.maps.Map(mapRef.current, mapOptions);

             const latOffset = (lotDepth / 2) / 364000;
             const lngOffset = (lotWidth / 2) / 270000;
             const lat = location.lat();
             const lng = location.lng();
             const buildingFootprint = [
               { lat: lat + latOffset, lng: lng - lngOffset }, 
               { lat: lat + latOffset, lng: lng + lngOffset }, 
               { lat: lat - latOffset, lng: lng + lngOffset }, 
               { lat: lat - latOffset, lng: lng - lngOffset }, 
             ];

             new window.google.maps.Polygon({
               paths: buildingFootprint,
               strokeColor: "#3b82f6",
               strokeOpacity: 1.0,
               strokeWeight: 2,
               fillColor: "#3b82f6",
               fillOpacity: 0.4,
               map: map
             });
             new window.google.maps.Marker({
               position: location,
               map: map,
               title: address,
             });
           }
         });
       } catch (e) { console.error(e); }
    };
    initMap();
  }, [isScriptLoaded, address, lotWidth, lotDepth, show3D]);

  const toggle3D = () => {
    setShow3D(!show3D);
  };

  if (!apiKey) return <div className="flex items-center justify-center h-full min-h-[400px] bg-slate-900/50 text-slate-400 text-xs">Map Placeholder (Add API Key)</div>;
  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-slate-800">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 flex flex-col gap-2">
         <button onClick={toggle3D} className="p-2 bg-slate-800 rounded shadow text-slate-200 hover:text-cyan-400"><Box size={16} /></button>
      </div>
    </div>
  );
};

const MockGISMap = ({ onParcelClick }) => (
  <div className="w-full h-full min-h-[400px] bg-slate-800 relative overflow-hidden group cursor-crosshair">
    <svg width="100%" height="100%" viewBox="0 0 400 400" className="absolute inset-0 opacity-20">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
       <span className="bg-slate-900/80 px-4 py-2 rounded-full text-xs font-bold text-slate-400 shadow-sm border border-slate-700">Interactive Simulation Map</span>
    </div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 grid grid-cols-2 gap-1 p-1">
       <div onClick={() => onParcelClick('B3-2')} className="bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/40 cursor-pointer flex items-center justify-center text-[10px] font-bold text-blue-300">B3-2</div>
       <div onClick={() => onParcelClick('C1-2')} className="bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/40 cursor-pointer flex items-center justify-center text-[10px] font-bold text-amber-300">C1-2</div>
       <div onClick={() => onParcelClick('DX-5')} className="bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/40 cursor-pointer flex items-center justify-center text-[10px] font-bold text-purple-300">DX-5</div>
       <div onClick={() => onParcelClick('RS-3')} className="bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 cursor-pointer flex items-center justify-center text-[10px] font-bold text-emerald-300">RS-3</div>
    </div>
  </div>
);

const IsometricCanvas = ({ lot, buildingFloors, parkingFloors, zoning, sunAngle = 45 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for(let i=0; i<width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
    for(let i=0; i<height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }

    const SCALE = 2.0; 
    const centerX = width / 2;
    const centerY = height * 0.75; 
    const toIso = (x, y, z) => ({ x: centerX + (x - y) * SCALE, y: centerY + (x + y) * 0.5 * SCALE - z * SCALE });
    
    const drawPoly = (points, color, stroke = null, alpha = 1.0) => {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      if (color) { ctx.fillStyle = color; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.globalAlpha = 1.0;
    };
    
    const lotW = lot.width; const lotD = lot.depth;
    const p1 = toIso(-lotW/2, -lotD/2, 0); const p2 = toIso(lotW/2, -lotD/2, 0); const p3 = toIso(lotW/2, lotD/2, 0); const p4 = toIso(-lotW/2, lotD/2, 0);
    drawPoly([p1, p2, p3, p4], '#1e293b', '#475569'); 

    const bW = Math.max(0, lotW - zoning.setbacks.side * 2);
    const bD = Math.max(0, lotD - zoning.setbacks.front - zoning.setbacks.rear);
    const offX = 0; const offY = (zoning.setbacks.front - zoning.setbacks.rear) / 2;
    
    const sb1 = toIso(-bW/2 + offX, -bD/2 + offY, 0.2); const sb2 = toIso(bW/2 + offX, -bD/2 + offY, 0.2); const sb3 = toIso(bW/2 + offX, bD/2 + offY, 0.2); const sb4 = toIso(-bW/2 + offX, bD/2 + offY, 0.2);
    ctx.setLineDash([5, 5]); drawPoly([sb1, sb2, sb3, sb4], null, '#94a3b8'); ctx.setLineDash([]);

    let currentZ = 0;
    const renderStack = [];
    
    parkingFloors.forEach(p => { 
       if (!p.isSubt) renderStack.push({ ...p, color: '#64748b', isParking: true, isPodium: true }); 
    });
    
    buildingFloors.forEach(f => { 
       let color = '#0ea5e9'; 
       const isRetail = f.type === 'retail';
       if (isRetail) color = '#f59e0b'; 
       renderStack.push({ ...f, color, isParking: false, isPodium: isRetail }); 
    });

    renderStack.forEach((floor) => {
      const flrH = floor.height;
      // Fixed: Define floor width and depth for 3D drawing
      const maxArea = bW * bD;
      const ratio = (floor.isPodium || floor.isParking) ? 1.0 : (maxArea > 0 ? Math.sqrt(floor.area / maxArea) : 1);
      const flrW = bW * ratio;
      const flrD = bD * ratio;

      const b1 = toIso(-flrW/2 + offX, -flrD/2 + offY, currentZ);
      const b2 = toIso(flrW/2 + offX, -flrD/2 + offY, currentZ);
      const b3 = toIso(flrW/2 + offX, flrD/2 + offY, currentZ);
      const b4 = toIso(-flrW/2 + offX, flrD/2 + offY, currentZ);
      const t1 = toIso(-flrW/2 + offX, -flrD/2 + offY, currentZ + flrH);
      const t2 = toIso(flrW/2 + offX, -flrD/2 + offY, currentZ + flrH);
      const t3 = toIso(flrW/2 + offX, flrD/2 + offY, currentZ + flrH);
      const t4 = toIso(-flrW/2 + offX, flrD/2 + offY, currentZ + flrH);
      
      const shadowLen = (currentZ + flrH) * 1.5; 
      const rad = (sunAngle * Math.PI) / 180;
      const shX = Math.cos(rad) * shadowLen;
      const shY = Math.sin(rad) * shadowLen;
      
      // Calculate Shadow Points
      const s1 = toIso(-flrW/2 + offX + shX, -flrD/2 + offY + shY, 0);
      const s2 = toIso(flrW/2 + offX + shX, -flrD/2 + offY + shY, 0);
      const s3 = toIso(flrW/2 + offX + shX, flrD/2 + offY + shY, 0);
      const s4 = toIso(-flrW/2 + offX + shX, flrD/2 + offY + shY, 0);

      ctx.globalAlpha = 0.15; 
      drawPoly([s1, s2, s3, s4], '#000000', null, 0.1); 

      drawPoly([b2, b3, t3, t2], floor.color, '#ffffff', 0.8); 
      drawPoly([b3, b4, t4, t3], shadeColor(floor.color, -10), '#ffffff', 0.9); 
      drawPoly([t1, t2, t3, t4], floor.color, '#ffffff', 1.0); 
      
      currentZ += flrH;
    });
  }, [lot, buildingFloors, parkingFloors, zoning, sunAngle]);

  function shadeColor(color, percent) { return color; }
  return <canvas ref={canvasRef} width={600} height={500} className="w-full h-full object-contain" />;
};

// --- DATA ---
const CHICAGO_ZONING_DB = {
  "B1-1": { code: "B1-1", far: 1.2, height: 38, mla: 2500, setbacks: { front: 0, rear: 30, side: 0 } },
  "C1-2": { code: "C1-2", far: 2.2, height: 50, mla: 1000, setbacks: { front: 0, rear: 30, side: 0 } },
  "DX-5": { code: "DX-5", far: 5.0, height: 900, mla: 200, setbacks: { front: 0, rear: 0, side: 0 } },
};
const UNIT_TYPES = { studio: { size: 450 }, oneBed: { size: 700 }, twoBed: { size: 1000 }, threeBed: { size: 1300 }, fourBed: { size: 1600 } };
const MOCK_ADDRESS_DB = { "1000 W RANDOLPH": "DX-5" };

// --- UI HELPERS ---
const NavButton = ({ active, id, icon: Icon, label, onClick }) => (
  <button onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${active === id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <Icon size={20} /><span className="font-medium text-sm">{label}</span>
  </button>
);
const Card = ({ title, children, className="" }) => (
  <div className={`${THEME.card} flex flex-col mb-6 ${className} rounded-xl overflow-hidden`}>
    {title && <div className="px-5 py-3 border-b border-slate-700/50 font-bold text-slate-100 bg-white/5 text-sm uppercase tracking-wide flex items-center gap-2">{title}</div>}
    <div className="p-5 flex-1">{children}</div>
  </div>
);
const MoneyRow = ({ label, value, isTotal, isNegative, subtext, highlight }) => (
  <div className={`flex justify-between items-baseline py-1.5 ${isTotal ? 'border-t border-slate-600 mt-2 pt-2 font-bold text-white' : 'text-slate-300 text-sm'} ${highlight ? 'bg-white/10 -mx-2 px-2 rounded' : ''}`}>
    <div>{label}{subtext && <span className="block text-[10px] text-slate-500 font-normal">{subtext}</span>}</div>
    <div className={`font-mono ${isNegative ? 'text-rose-400' : ''} ${highlight ? 'text-emerald-400 font-bold' : ''}`}>
      {isNegative ? '(' : ''}${typeof value === 'number' ? formatNumber(value) : 0}{isNegative ? ')' : ''}
    </div>
  </div>
);
const SliderInput = ({ label, value, onChange, min, max, step, unit }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1.5"><label className="text-xs font-medium text-slate-400">{label}</label><span className="text-xs font-bold text-cyan-400">{value}{unit}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
  </div>
);

// Formatted input field with commas and ID fix
const InputField = ({ label, value, onChange, prefix, suffix, step=1, disabled=false, id }) => {
  const [localVal, setLocalVal] = useState('');
  const inputId = id || `input-${label ? label.replace(/\s+/g, '-') : Math.random()}`;

  useEffect(() => {
    if (value !== undefined && value !== null && document.activeElement !== document.getElementById(inputId)) {
      setLocalVal(value.toLocaleString());
    }
  }, [value, inputId]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setLocalVal(raw.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      onChange(raw === '' ? 0 : parseFloat(raw));
    }
  };

  return (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-[10px] uppercase font-bold text-slate-500">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1.5 text-slate-500 text-sm">{prefix}</span>}
        <input 
          id={inputId}
          type="text" 
          disabled={disabled}
          value={localVal} 
          onChange={handleChange} 
          className={`${THEME.input} w-full rounded px-2 py-1.5 text-sm outline-none ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-8' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
        />
        {suffix && <span className="absolute right-2 top-1.5 text-slate-500 text-xs">{suffix}</span>}
      </div>
    </div>
  );
};

// --- SENSITIVITY MATRIX COMPONENT ---
const SensitivityMatrix = ({ baseNOI, baseCap, baseCost }) => {
  const capSteps = [-0.005, -0.0025, 0, 0.0025, 0.005]; 
  const noiSteps = [-0.05, -0.025, 0, 0.025, 0.05]; 
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-center border-collapse">
        <thead>
          <tr>
            <th className="p-2 bg-slate-800 text-slate-400 border border-slate-700">NOI \ Cap</th>
            {capSteps.map(c => <th key={c} className="p-2 bg-slate-800 text-slate-300 border border-slate-700">{((baseCap + c)*100).toFixed(2)}%</th>)}
          </tr>
        </thead>
        <tbody>
          {noiSteps.map(n => {
             const rowNOI = baseNOI * (1 + n);
             return (
               <tr key={n}>
                 <td className="p-2 bg-slate-800 text-slate-300 border border-slate-700 font-bold">{n > 0 ? '+' : ''}{(n*100).toFixed(1)}%</td>
                 {capSteps.map(c => {
                    const rowCap = baseCap + c;
                    const val = rowNOI / rowCap;
                    const profit = val - baseCost;
                    const roi = baseCost > 0 ? (profit / baseCost) * 100 : 0;
                    const color = roi > 20 ? 'text-emerald-400 font-bold' : roi > 10 ? 'text-emerald-200' : roi > 0 ? 'text-slate-200' : 'text-rose-400';
                    return <td key={c} className={`p-2 border border-slate-700 ${color}`}>{(roi).toFixed(1)}%</td>
                 })}
               </tr>
             )
          })}
        </tbody>
      </table>
      <div className="text-[10px] text-slate-500 mt-2 text-center">Matrix shows Profit Margin % (Value vs Cost) based on Exit Cap & NOI variations.</div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [activeTab, setActiveTab] = useState('visualizer'); 
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('3d'); 
  
  const [lot, setLot] = useState({ width: 125, depth: 100 });
  const [zoning, setZoning] = useState({ code: "C1-2 (Manual)", far: 2.2, maxHeight: 50, setbacks: { front: 0, rear: 30, side: 0 }, mla: 1000, parkingRes: 1.0, parkingRetail: 2.5 });
  const [searchAddress, setSearchAddress] = useState("");
  const [searchAPN, setSearchAPN] = useState(""); 
  const [mapAddress, setMapAddress] = useState(""); 
  const [googleApiKey, setGoogleApiKey] = useState(""); 
  const [geminiApiKey, setGeminiApiKey] = useState(""); 
  const [proxyUrl, setProxyUrl] = useState(DEFAULT_PROXY_URL); 
  const [parseStatus, setParseStatus] = useState("idle");
  const [errorDetails, setErrorDetails] = useState(""); 
  const [pastedZoning, setPastedZoning] = useState("");
  
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // NEW UNIT MIX (3/4 Beds)
  const [mix, setMix] = useState({ studio: 15, oneBed: 35, twoBed: 35, threeBed: 10, fourBed: 5 }); 
  const [circulation, setCirculation] = useState(0.15); 
  const totalMix = mix.studio + mix.oneBed + mix.twoBed + mix.threeBed + mix.fourBed;
  const isMixValid = totalMix === 100;
  
  const [targetRetail, setTargetRetail] = useState(3000); 
  const [parkingStrategy, setParkingStrategy] = useState('podium'); 
  const [isTOD, setIsTOD] = useState(false); 
  const [manualParkingOverride, setManualParkingOverride] = useState(null);
  const [varianceMode, setVarianceMode] = useState(false);
  const [sunAngle, setSunAngle] = useState(135); 
  const [visualizerMode, setVisualizerMode] = useState('studio'); 
  const [compareMode, setCompareMode] = useState(false);

  // COSTS
  const [costs, setCosts] = useState({ 
    landCost: 3500000, 
    hardCostRes: 250, 
    hardCostRetail: 200, 
    hardCostParking: 90, 
    hardCostSubt: 160, 
    softCostLoad: 0.30, 
    closingCosts: 0.02,
    preDevCost: 150000 
  });

  // EXPENSES
  const [expenses, setExpenses] = useState({
    taxesPercent: 0.015, insurancePerUnit: 500, utilitiesPerUnit: 600, repairsPerUnit: 400, mgmtPercent: 0.04, reservesPerUnit: 250 
  });

  const [rents, setRents] = useState({ 
    rentStudio: 2100, rent1Bed: 2800, rent2Bed: 3800, rent3Bed: 4500, rent4Bed: 5500, rentRetail: 45, parkingIncome: 150, vacancyRes: 0.05, vacancyRetail: 0.10, opexRatio: 0.35 
  });

  // CAPITAL SOURCES
  const [capitalSources, setCapitalSources] = useState([
    { id: 1, name: "Senior Loan", amount: 0, rate: 0.075, amortization: 30, isSoft: false, isEditing: true }
  ]);
  const [loanExitCap, setLoanExitCap] = useState(0.06);
  const [operatingAssumptions, setOperatingAssumptions] = useState({ rentGrowth: 0.03, expenseGrowth: 0.025 });

  const updateSource = (id, field, value) => setCapitalSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const toggleSourceEdit = (id) => setCapitalSources(prev => prev.map(s => s.id === id ? { ...s, isEditing: !s.isEditing } : s));
  const addSource = () => setCapitalSources(prev => [...prev, { id: Date.now(), name: "New Source", amount: 0, rate: 0.08, amortization: 25, isSoft: false, isEditing: true }]);
  const removeSource = (id) => setCapitalSources(prev => prev.filter(s => s.id !== id));

  const calculateRLV = (noi, hardCosts, softCosts) => {
    const targetYield = 0.065; 
    const maxProjectCost = noi / targetYield;
    return Math.max(0, maxProjectCost - hardCosts - softCosts);
  };

  const parseZoningText = () => {
    // Simple regex parser
    const farMatch = pastedZoning.match(/FAR.*?(\d+(\.\d+)?)/i);
    const heightMatch = pastedZoning.match(/Height.*?(\d+)/i);
    if(farMatch || heightMatch) {
       setZoning(prev => ({
         ...prev,
         code: "Custom/Parsed",
         far: farMatch ? parseFloat(farMatch[1]) : prev.far,
         maxHeight: heightMatch ? parseInt(heightMatch[1]) : prev.maxHeight
       }));
       alert("Parsed! Check the visualizer for updates.");
    } else {
       alert("Could not find FAR or Height in text. Try pasting a cleaner snippet.");
    }
  };

  const analysis = useMemo(() => {
    const lotArea = lot.width * lot.depth;
    const activeFAR = varianceMode ? zoning.far * 1.2 : zoning.far;
    const activeHeight = varianceMode ? zoning.maxHeight * 1.2 : zoning.maxHeight;
    const maxAllowedGSF = lotArea * activeFAR;
    const buildableWidth = Math.max(0, lot.width - (zoning.setbacks.side * 2));
    const buildableDepth = Math.max(0, lot.depth - zoning.setbacks.front - zoning.setbacks.rear);
    const maxFootprint = buildableWidth * buildableDepth;
    const efficiency = 1 - circulation;

    const normMix = { 
        studio: mix.studio / totalMix, oneBed: mix.oneBed / totalMix, twoBed: mix.twoBed / totalMix,
        threeBed: mix.threeBed / totalMix, fourBed: mix.fourBed / totalMix 
    };
    const avgUnitSize = (UNIT_TYPES.studio.size * normMix.studio) + 
                        (UNIT_TYPES.oneBed.size * normMix.oneBed) + 
                        (UNIT_TYPES.twoBed.size * normMix.twoBed) +
                        (UNIT_TYPES.threeBed?.size || 1300) * normMix.threeBed + 
                        (UNIT_TYPES.fourBed?.size || 1600) * normMix.fourBed;

    const gsfPerUnit = avgUnitSize / efficiency;

    let currentHeight = 0; let usedGSF = 0; const floors = [];

    // Retail Floor - FULL FOOTPRINT
    if (targetRetail > 0) {
      const retailArea = Math.min(maxFootprint, Math.min(maxAllowedGSF, targetRetail * 1.15));
      floors.push({ type: 'retail', height: 18, area: maxFootprint, level: 1, units: 0 }); 
      currentHeight += 18; usedGSF += retailArea;
    }

    const remainingHeight = activeHeight - currentHeight;
    const maxResFloorsByHeight = Math.floor(remainingHeight / 11);
    let resFloorsCount = 0; const maxUnitsByDensity = Math.floor(lotArea / zoning.mla); let currentTotalUnits = 0;

    while (resFloorsCount < maxResFloorsByHeight) {
       if (usedGSF >= maxAllowedGSF) break;
       let floorArea = Math.min(maxFootprint, maxAllowedGSF - usedGSF);
       if (floorArea < 2000) break; 
       
       let unitsOnFloor = Math.floor(floorArea / gsfPerUnit);
       
       if (currentTotalUnits + unitsOnFloor > maxUnitsByDensity) { unitsOnFloor = Math.max(0, maxUnitsByDensity - currentTotalUnits); if (unitsOnFloor === 0) break; }
       
       floors.push({ type: 'residential', height: 11, area: floorArea, level: floors.length + 1, units: unitsOnFloor });
       usedGSF += floorArea; currentHeight += 11; currentTotalUnits += unitsOnFloor; resFloorsCount++;
    }

    const totalUnits = floors.reduce((acc, f) => acc + f.units, 0);
    let reqResSpots = isTOD ? 0 : Math.ceil(totalUnits * zoning.parkingRes);
    const reqRetailSpots = Math.ceil((targetRetail/1000) * zoning.parkingRetail);
    let finalParkingCount = manualParkingOverride !== null ? manualParkingOverride : (reqResSpots + reqRetailSpots);
    
    // Parking Geometry (Podium fix)
    const parkingAreaNeeded = finalParkingCount * 350; 
    const parkingFootprint = parkingStrategy === 'podium' ? maxFootprint : lotArea * 0.90; 
    const parkingLevels = Math.ceil(parkingAreaNeeded / parkingFootprint);
    const parkingFloors = Array.from({length: parkingLevels}, (_, i) => ({ type: 'parking', height: 10, area: parkingFootprint, isSubt: parkingStrategy === 'underground' }));

    const buildCostRes = floors.filter(f=>f.type==='residential').reduce((acc,f) => acc + (f.area * costs.hardCostRes), 0);
    const buildCostRetail = floors.filter(f=>f.type==='retail').reduce((acc,f) => acc + (f.area * costs.hardCostRetail), 0);
    const buildCostParking = parkingFloors.reduce((acc,f) => acc + (f.area * (f.isSubt ? costs.hardCostSubt : costs.hardCostParking)), 0);
    const totalHardCosts = buildCostRes + buildCostRetail + buildCostParking;
    const totalSoftCosts = totalHardCosts * costs.softCostLoad;
    const acquisitionCosts = costs.landCost * (1 + costs.closingCosts);
    const totalUses = acquisitionCosts + totalHardCosts + totalSoftCosts + costs.preDevCost; 
    
    const totalDebt = capitalSources.reduce((acc, source) => acc + source.amount, 0);
    const equityRequired = Math.max(0, totalUses - totalDebt);

    let annualHardDebtService = 0;
    capitalSources.forEach(source => { if (!source.isSoft) annualHardDebtService += calculatePMT(source.amount, source.rate, source.amortization); });

    const grossRentRes = (
        (totalUnits * normMix.studio * rents.rentStudio) + 
        (totalUnits * normMix.oneBed * rents.rent1Bed) + 
        (totalUnits * normMix.twoBed * rents.rent2Bed) +
        (totalUnits * normMix.threeBed * rents.rent3Bed) +
        (totalUnits * normMix.fourBed * rents.rent4Bed)
    ) * 12;
    
    const grossRentRetail = (floors.find(f=>f.type==='retail')?.area || 0) * efficiency * rents.rentRetail;
    const grossParking = finalParkingCount * rents.parkingIncome * 12;
    const pgi = grossRentRes + grossRentRetail + grossParking; 
    const vacancy = (grossRentRes * rents.vacancyRes) + (grossRentRetail * rents.vacancyRetail);
    const egi = pgi - vacancy;
    
    const expMgmt = egi * expenses.mgmtPercent;
    const expTaxes = totalUses * expenses.taxesPercent; 
    const expIns = totalUnits * expenses.insurancePerUnit;
    const expUtil = totalUnits * expenses.utilitiesPerUnit;
    const expRepairs = totalUnits * expenses.repairsPerUnit;
    const totalOpEx = expMgmt + expTaxes + expIns + expUtil + expRepairs;
    
    const noi = egi - totalOpEx;
    const annualReserves = totalUnits * expenses.reservesPerUnit;
    const adjustedNOI = noi - annualReserves;

    const yieldOnCost = totalUses > 0 ? noi / totalUses : 0;
    const cashFlow = adjustedNOI - annualHardDebtService;
    const cashOnCash = equityRequired > 0 ? cashFlow / equityRequired : 0;
    const exitValue = noi / loanExitCap;
    const profit = exitValue - totalUses;
    const returnOnEquity = equityRequired > 0 ? profit / equityRequired : 0;
    
    const residualLandValue = calculateRLV(noi, totalHardCosts, totalSoftCosts + costs.preDevCost);

    const cashFlowForecast = [];
    let currentNOI = noi; let currentOpEx = totalOpEx; let currentEGI = egi; let currentDebt = annualHardDebtService; let currentReserves = annualReserves;
    cashFlowForecast.push({ year: 0, cashFlow: -equityRequired, noi: 0, debt: 0, exit: 0 });

    for (let yr = 1; yr <= 15; yr++) {
      if (yr > 1) {
        currentEGI = currentEGI * (1 + operatingAssumptions.rentGrowth);
        currentOpEx = currentOpEx * (1 + operatingAssumptions.expenseGrowth);
        currentNOI = currentEGI - currentOpEx;
        currentReserves = currentReserves * (1 + operatingAssumptions.expenseGrowth); 
      }
      let netCF = currentNOI - currentReserves - currentDebt;
      let saleProceeds = 0;
      if (yr === 10) { const salePrice = currentNOI / loanExitCap; const salesCosts = salePrice * 0.02; const totalPayoff = totalDebt; saleProceeds = salePrice - salesCosts - totalPayoff; netCF += saleProceeds; }
      cashFlowForecast.push({ year: yr, pgi: Math.round(currentEGI + vacancy), egi: Math.round(currentEGI), opex: Math.round(currentOpEx), noi: Math.round(currentNOI), reserves: Math.round(currentReserves), debt: Math.round(currentDebt), cashFlow: Math.round(netCF), exit: Math.round(saleProceeds) });
    }
    const cashFlowArray = cashFlowForecast.map(c => c.cashFlow);
    const irr = calculateIRR(cashFlowArray);
    const equityMultiple = (cashFlowArray.filter(cf=>cf>0).reduce((a,b)=>a+b, 0)) / equityRequired;

    return { 
      lotArea, maxAllowedGSF, usedGSF, currentHeight, floors, parkingFloors, totalUnits, 
      parkingStats: { provided: finalParkingCount }, 
      sourcesUses: { totalUses, acquisitionCosts, totalHardCosts, totalSoftCosts, totalDebt, equityRequired }, 
      financials: { pgi, vacancy, egi, opex: totalOpEx, noi, totalProjectCost: totalUses, yieldOnCost, totalDebt, equityRequired, annualDebtService: annualHardDebtService, cashFlow, cashOnCash, exitValue, profit, returnOnEquity, forecast: cashFlowForecast, irr, equityMultiple, reserves: annualReserves, residualLandValue }, 
      constraints: { hitHeight: currentHeight + 11 > activeHeight, hitFAR: usedGSF >= maxAllowedGSF * 0.98, hitDensity: currentTotalUnits >= maxUnitsByDensity } 
    };
  }, [lot, zoning, mix, targetRetail, parkingStrategy, costs, rents, expenses, isTOD, manualParkingOverride, capitalSources, loanExitCap, varianceMode, operatingAssumptions, circulation]);

  const optimizeMix = () => {
    // Basic logic
    setMix({ studio: 40, oneBed: 40, twoBed: 20, threeBed: 0, fourBed: 0 });
    alert("Optimized for typical urban density.");
  };

  const handleAddressSearch = async () => {
    setParseStatus("processing"); setErrorDetails(""); const term = searchAddress.toUpperCase().trim(); 
    if(term) setMapAddress(term);
    if (proxyUrl && proxyUrl.length > 5) {
      try {
        const endpoint = proxyUrl.endsWith('/api/zoning') ? proxyUrl : `${proxyUrl}/api/zoning`;
        const params = searchAPN ? `?pin=${searchAPN}` : `?address=${encodeURIComponent(term)}`; 
        const response = await fetch(`${endpoint}${params}`);
        const data = await response.json();
        if (data.success) {
           const rawCode = data.zone_class; const dbKey = Object.keys(CHICAGO_ZONING_DB).find(k => k.replace("-","") === rawCode.replace("-","")); const zoneDetails = dbKey ? CHICAGO_ZONING_DB[dbKey] : null;
           setZoning(prev => ({ ...prev, code: `Chicago ${rawCode}`, far: zoneDetails ? zoneDetails.far : 2.0, maxHeight: zoneDetails ? zoneDetails.height : 50, setbacks: zoneDetails ? zoneDetails.setbacks : { front: 0, rear: 30, side: 0 }, mla: zoneDetails ? zoneDetails.mla : 1000 }));
           setParseStatus("success"); setTimeout(() => setParseStatus("idle"), 800); return;
        } else { setErrorDetails(data.message); setParseStatus("error"); return; }
      } catch (err) { setErrorDetails("Connection error."); setParseStatus("error"); return; }
    }
    setTimeout(() => {
      let foundZoneKey = Object.keys(CHICAGO_ZONING_DB).find(k => term.includes(k) || term.includes(k.replace("-", ""))) || "C1-2";
      setZoning(prev => ({ ...prev, code: `Chicago ${CHICAGO_ZONING_DB[foundZoneKey].code}`, ...CHICAGO_ZONING_DB[foundZoneKey] }));
      setParseStatus("success"); setTimeout(() => setParseStatus("idle"), 800);
    }, 1500);
  };
  
  const generateAIReport = async () => {
    if (!geminiApiKey) { alert("Please enter a Gemini API Key in Settings."); setShowSettings(true); return; }
    setIsGeneratingReport(true);
    const prompt = `Write a professional real estate investment memorandum executive summary for ${searchAddress}.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]) setAiReport(data.candidates[0].content.parts[0].text); 
      else setAiReport("Error: Could not generate report.");
    } catch (error) { setAiReport("Network Error."); } 
    finally { setIsGeneratingReport(false); }
  };

  return (
    <div className={`flex h-screen ${THEME.bg} ${THEME.text} font-sans overflow-hidden transition-colors duration-300`}>
      {/* SIDEBAR */}
      <div className={`w-64 ${THEME.sidebar} flex flex-col p-4 shrink-0 z-20`}>
        <div className="flex items-center gap-2 mb-8 px-2"><div className={`${THEME.accentBg} p-2 rounded-lg text-white shadow-lg`}><Layers size={20} /></div><div><h1 className="font-bold text-lg leading-none">ZoneEnvelope</h1><span className={`text-[10px] ${THEME.accentText} font-bold uppercase tracking-wider`}>PRO EDITION</span></div></div>
        <NavButton id="visualizer" icon={Maximize} label="Massing Studio" active={activeTab} onClick={setActiveTab} theme={THEME} />
        <NavButton id="financials" icon={Calculator} label="Financial Model" active={activeTab} onClick={setActiveTab} theme={THEME} />
        <NavButton id="sensitivity" icon={Table} label="Sensitivity" active={activeTab} onClick={setActiveTab} theme={THEME} />
        <NavButton id="report" icon={FileText} label="Investment Report" active={activeTab} onClick={setActiveTab} theme={THEME} />
        <NavButton id="zoning" icon={MapIcon} label="GIS / Zoning" active={activeTab} onClick={setActiveTab} theme={THEME} />
        <div className="mt-auto">
          <button onClick={() => setShowSettings(true)} className={`flex items-center gap-2 text-xs ${THEME.textMuted} hover:${THEME.text} mb-4 px-2`}><Settings size={14}/> Settings</button>
          <div className={`${THEME.card} p-4 rounded-xl`}>
            <div className={`text-xs font-bold uppercase mb-1 ${THEME.textMuted}`}>Project IRR</div>
            <div className={`text-2xl font-mono font-bold ${analysis.financials.irr > 0.15 ? THEME.success : THEME.text}`}>{(analysis.financials.irr * 100).toFixed(1)}%</div>
            <div className={`text-[10px] ${THEME.textMuted} mt-2 flex justify-between`}><span>Profit: ${(analysis.financials.profit/1000000).toFixed(1)}M</span><span>YOC: {(analysis.financials.yieldOnCost * 100).toFixed(2)}%</span></div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} apiKey={googleApiKey} setApiKey={setGoogleApiKey} proxyUrl={proxyUrl} setProxyUrl={setProxyUrl} geminiKey={geminiApiKey} setGeminiKey={setGeminiApiKey} theme={THEME} />
        
        {/* HEADER */}
        <div className={`h-16 border-b ${THEME.border} flex items-center justify-between px-6 shrink-0 z-10 backdrop-blur-sm ${THEME.bg}/80`}>
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-96 max-w-lg">
               <input type="text" className={`${THEME.input} w-full pl-9 pr-12 py-2 rounded-lg text-sm font-medium transition-all`} placeholder="Search Address or APN..." value={searchAddress} onChange={(e)=>setSearchAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()} />
               <Search className={`absolute left-3 top-2.5 ${THEME.textMuted}`} size={16} />
               <div className="absolute right-1 top-1 flex gap-1"><button onClick={handleAddressSearch} className={`p-1.5 rounded hover:bg-black/5 ${THEME.textMuted} hover:${THEME.accentText}`}><ArrowRight size={14} /></button></div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`text-xs ${THEME.textMuted} font-medium mr-2 border-r ${THEME.border} pr-4`}>{zoning.code} • FAR {zoning.far}{varianceMode && <span className={THEME.accentText}> (+20%)</span>}</div>
             <button onClick={() => downloadCSV(analysis.financials)} className={`p-2 ${THEME.textMuted} hover:${THEME.accentText}`} title="Export CSV"><FileSpreadsheet size={20} /></button>
          </div>
        </div>

        {/* --- TABS --- */}
        
        {/* VISUALIZER */}
        {activeTab === 'visualizer' && (
          <div className="flex-1 flex overflow-hidden">
            <div className={`w-80 border-r ${THEME.border} overflow-y-auto p-5 space-y-6 ${THEME.bg}`}>
               {/* Controls */}
               <div>
                  <h3 className={`text-xs font-bold ${THEME.textMuted} uppercase mb-3 flex items-center gap-2`}><Building2 size={12}/> Unit Mix</h3>
                  <div className="flex justify-between items-end mb-2">
                     <span className={`text-[10px] font-bold ${isMixValid ? THEME.success : THEME.danger}`}>Total: {totalMix}%</span>
                     {!isMixValid && <span className="text-[10px] text-rose-500">{totalMix > 100 ? `Remove ${totalMix-100}%` : `Add ${100-totalMix}%`}</span>}
                  </div>
                  <SliderInput label="Studio" value={mix.studio} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, studio: v})} theme={THEME} />
                  <SliderInput label="1 Bed" value={mix.oneBed} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, oneBed: v})} theme={THEME} />
                  <SliderInput label="2 Bed" value={mix.twoBed} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, twoBed: v})} theme={THEME} />
                  <SliderInput label="3 Bed" value={mix.threeBed || 0} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, threeBed: v})} theme={THEME} />
                  <SliderInput label="4 Bed" value={mix.fourBed || 0} min={0} max={100} step={5} unit="%" onChange={(v) => setMix({...mix, fourBed: v})} theme={THEME} />
                  <div className={`pt-4 border-t ${THEME.border} mt-4`}>
                     <SliderInput label="Efficiency / Circulation" value={Math.round(circulation*100)} min={0} max={40} step={1} unit="%" onChange={(v) => setCirculation(v/100)} theme={THEME} />
                  </div>
               </div>
            </div>
            <div className={`flex-1 relative flex items-center justify-center bg-slate-950`}>
               <div className="w-full h-full relative p-10 flex items-center justify-center">
                  <IsometricCanvas lot={lot} buildingFloors={analysis.floors} parkingFloors={analysis.parkingFloors} zoning={zoning} sunAngle={sunAngle} />
               </div>
               <div className={`absolute bottom-6 left-6 p-4 rounded-xl border ${THEME.border} text-xs shadow-2xl ${THEME.card}`}>
                 <div className={`font-bold ${THEME.text} mb-2`}>Massing Stats</div>
                 <div className={`grid grid-cols-2 gap-x-8 gap-y-1 ${THEME.textMuted}`}>
                    <span>Height:</span> <span className={`${THEME.text} font-mono`}>{analysis.currentHeight}'</span>
                    <span>FAR:</span> <span className={`${THEME.text} font-mono`}>{(analysis.usedGSF / analysis.lotArea).toFixed(2)}</span>
                    <span>Units:</span> <span className={`${THEME.text} font-mono`}>{analysis.totalUnits}</span>
                    <span>NRA:</span> <span className={`${THEME.text} font-mono`}>{formatNumber(analysis.usedGSF * (1-circulation))} sf</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {activeTab === 'financials' && (
           <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                 
                 {/* SOURCE OF FUNDS */}
                 <Card title="Sources of Funds" theme={THEME}>
                    <div className="space-y-4">
                      {capitalSources.map((source, index) => (
                        <div key={source.id} className={`p-3 border rounded-lg mb-2 ${THEME.bg} ${THEME.border}`}>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                               <div className={`${THEME.accentBg} text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold`}>{index + 1}</div>
                               {!source.isEditing ? (
                                 <span className={`font-bold ${THEME.text}`}>{source.name}</span>
                               ) : (
                                 <input type="text" className={`${THEME.input} w-32 px-2 py-0.5 rounded text-xs`} value={source.name} onChange={(e) => updateSource(source.id, 'name', e.target.value)} />
                               )}
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => toggleSourceEdit(source.id)} className={`hover:${THEME.accentText} ${source.isEditing ? THEME.accentText : THEME.textMuted}`}>
                                 {source.isEditing ? <Save size={14}/> : <PenLine size={14}/>}
                               </button>
                               <button onClick={() => removeSource(source.id)} className={`${THEME.textMuted} hover:text-red-500`}><Trash2 size={14}/></button>
                             </div>
                          </div>
                          {source.isEditing ? (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className={`text-[10px] uppercase font-bold ${THEME.textMuted}`}>Amount</label><InputField id={`amt-${source.id}`} value={source.amount} onChange={(val) => updateSource(source.id, 'amount', val)} prefix="$" theme={THEME} /></div>
                                <div><label className={`text-[10px] uppercase font-bold ${THEME.textMuted}`}>Rate %</label><InputField id={`rate-${source.id}`} value={source.rate * 100} onChange={(val) => updateSource(source.id, 'rate', val/100)} theme={THEME} /></div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 text-xs mt-2 pl-7">
                               <div><span className={`${THEME.textMuted} block text-[10px]`}>Amount</span><span className={`font-mono font-bold ${THEME.accentText}`}>${formatNumber(source.amount)}</span></div>
                               <div><span className={`${THEME.textMuted} block text-[10px]`}>Terms</span>{(source.rate*100).toFixed(2)}% / {source.amortization}yr</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <button onClick={addSource} className={`w-full py-2 border-2 border-dashed ${THEME.border} rounded-lg ${THEME.textMuted} text-xs font-bold flex items-center justify-center gap-2 hover:${THEME.accentText} hover:border-current transition-colors`}><Plus size={14} /> Add Capital Source</button>
                      <div className={`pt-2 border-t ${THEME.border}`}><div className="flex justify-between text-xs mb-1"><span className={THEME.textMuted}>Total Sources</span><span className={`font-mono font-bold ${THEME.text}`}>${formatNumber(analysis.financials.totalDebt)}</span></div><div className="flex justify-between text-xs"><span className={THEME.textMuted}>Gap / Equity</span><span className={`font-mono font-bold ${THEME.accentText}`}>${formatNumber(analysis.financials.equityRequired)}</span></div></div>
                    </div>
                 </Card>

                 {/* ACQUISITION & CONSTRUCTION */}
                 <Card title="Acquisition & Construction" theme={THEME}>
                    <div className="space-y-4">
                       <InputField label="Land Purchase Price" id="land" prefix="$" value={costs.landCost} onChange={(v)=>setCosts({...costs, landCost: v})} theme={THEME} />
                       <InputField label="Soft Costs / Pre-Dev" id="soft" prefix="$" value={costs.preDevCost} onChange={(v)=>setCosts({...costs, preDevCost: v})} theme={THEME} />
                       <div className="grid grid-cols-2 gap-2"><InputField label="Res Hard Cost/SF" id="hc-res" prefix="$" value={costs.hardCostRes} onChange={(v)=>setCosts({...costs, hardCostRes: v})} theme={THEME} /><InputField label="Retail Hard Cost/SF" id="hc-ret" prefix="$" value={costs.hardCostRetail} onChange={(v)=>setCosts({...costs, hardCostRetail: v})} theme={THEME} /></div>
                       <div className="grid grid-cols-2 gap-2"><InputField label="Podium Parking/SF" id="hc-park" prefix="$" value={costs.hardCostParking} onChange={(v)=>setCosts({...costs, hardCostParking: v})} theme={THEME} /><InputField label="Underground Parking/SF" id="hc-subt" prefix="$" value={costs.hardCostSubt} onChange={(v)=>setCosts({...costs, hardCostSubt: v})} theme={THEME} /></div>
                       <InputField label="Soft Costs Load %" id="soft-load" suffix="%" value={costs.softCostLoad * 100} step={1} onChange={(v)=>setCosts({...costs, softCostLoad: v/100})} theme={THEME} />
                    </div>
                 </Card>

                 {/* REVENUE ASSUMPTIONS */}
                 <Card title="Revenue Assumptions (Monthly)" theme={THEME}>
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-2">
                         <InputField label="Studio Rent" id="rent-std" prefix="$" value={rents.rentStudio} onChange={(v)=>setRents({...rents, rentStudio: v})} theme={THEME} />
                         <InputField label="1-Bed Rent" id="rent-1b" prefix="$" value={rents.rent1Bed} onChange={(v)=>setRents({...rents, rent1Bed: v})} theme={THEME} />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <InputField label="2-Bed Rent" id="rent-2b" prefix="$" value={rents.rent2Bed} onChange={(v)=>setRents({...rents, rent2Bed: v})} theme={THEME} />
                         <InputField label="3-Bed Rent" id="rent-3b" prefix="$" value={rents.rent3Bed} onChange={(v)=>setRents({...rents, rent3Bed: v})} theme={THEME} />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <InputField label="4-Bed Rent" id="rent-4b" prefix="$" value={rents.rent4Bed} onChange={(v)=>setRents({...rents, rent4Bed: v})} theme={THEME} />
                         <InputField label="Retail Rent/SF/Yr" id="rent-ret" prefix="$" value={rents.rentRetail} onChange={(v)=>setRents({...rents, rentRetail: v})} theme={THEME} />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <InputField label="Parking $/Spot" id="rent-park" prefix="$" value={rents.parkingIncome} onChange={(v)=>setRents({...rents, parkingIncome: v})} theme={THEME} />
                         <InputField label="Vacancy %" id="vac-res" suffix="%" value={rents.vacancyRes*100} step={0.5} onChange={(v)=>setRents({...rents, vacancyRes: v/100})} theme={THEME} />
                       </div>
                    </div>
                 </Card>

                 {/* EXPENSE ASSUMPTIONS */}
                 <Card title="Operating Expenses" theme={THEME}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                         <InputField label="Taxes (% Value)" id="exp-tax" suffix="%" value={expenses.taxesPercent*100} step={0.1} onChange={(v)=>setExpenses({...expenses, taxesPercent: v/100})} theme={THEME} />
                         <InputField label="Mgmt Fee (% EGI)" id="exp-mgmt" suffix="%" value={expenses.mgmtPercent*100} step={0.5} onChange={(v)=>setExpenses({...expenses, mgmtPercent: v/100})} theme={THEME} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <InputField label="Ins $/Unit" id="exp-ins" prefix="$" value={expenses.insurancePerUnit} onChange={(v)=>setExpenses({...expenses, insurancePerUnit: v})} theme={THEME} />
                         <InputField label="Utils $/Unit" id="exp-util" prefix="$" value={expenses.utilitiesPerUnit} onChange={(v)=>setExpenses({...expenses, utilitiesPerUnit: v})} theme={THEME} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <InputField label="R&M $/Unit" id="exp-rm" prefix="$" value={expenses.repairsPerUnit} onChange={(v)=>setExpenses({...expenses, repairsPerUnit: v})} theme={THEME} />
                         <InputField label="Reserves $/Unit" id="exp-res" prefix="$" value={expenses.reservesPerUnit} onChange={(v)=>setExpenses({...expenses, reservesPerUnit: v})} theme={THEME} />
                      </div>
                    </div>
                 </Card>

                 <Card title="Operating Assumptions" theme={THEME}>
                    <div className="space-y-4">
                       <InputField label="Rent Growth %" id="rent-growth" value={operatingAssumptions.rentGrowth * 100} step={0.5} onChange={(v)=>setOperatingAssumptions({...operatingAssumptions, rentGrowth: v/100})} theme={THEME} />
                       <InputField label="Expense Growth %" id="exp-growth" value={operatingAssumptions.expenseGrowth * 100} step={0.5} onChange={(v)=>setOperatingAssumptions({...operatingAssumptions, expenseGrowth: v/100})} theme={THEME} />
                       <div className={`pt-2 border-t ${THEME.border}`}>
                          <label className={`text-xs font-bold ${THEME.textMuted} uppercase mb-2 block`}>Exit Assumptions</label>
                          <InputField label="Exit Cap Rate %" id="exit-cap" value={loanExitCap * 100} step={0.25} onChange={(v)=>setLoanExitCap(v/100)} theme={THEME} />
                       </div>
                    </div>
                 </Card>
              </div>

              {/* OUTPUTS COLUMN */}
              <div className="lg:col-span-8 space-y-6">
                 <Card title="Pro Forma Summary" theme={THEME}>
                    <div className="grid grid-cols-3 gap-4">
                       <div className={`p-4 rounded-lg text-center border ${THEME.name === 'dark' ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                          <div className={`text-[10px] uppercase font-bold ${THEME.name === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>Levered IRR</div>
                          <div className={`text-2xl font-bold ${THEME.name === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{(analysis.financials.irr*100).toFixed(1)}%</div>
                       </div>
                       <div className={`p-4 rounded-lg text-center border ${THEME.name === 'dark' ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
                          <div className={`text-[10px] uppercase font-bold ${THEME.name === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>Equity Multiple</div>
                          <div className={`text-2xl font-bold ${THEME.name === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>{analysis.financials.equityMultiple.toFixed(2)}x</div>
                       </div>
                       <div className={`p-4 rounded-lg text-center border ${THEME.border} ${THEME.card}`}>
                          <div className={`text-[10px] uppercase font-bold ${THEME.textMuted}`}>Net Profit</div>
                          <div className={`text-2xl font-bold ${THEME.text}`}>${(analysis.financials.profit/1000000).toFixed(1)}M</div>
                       </div>
                    </div>
                 </Card>
                 
                 <Card title="Sources & Uses Summary" theme={THEME}>
                   <div className={`grid grid-cols-2 gap-8 text-xs ${THEME.name === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div>
                        <h4 className={`font-bold ${THEME.textMuted} uppercase mb-2 border-b ${THEME.border} pb-1`}>Uses of Funds</h4>
                        <div className="flex justify-between py-1"><span>Land Acquisition</span><span>${formatNumber(analysis.sourcesUses.acquisitionCosts)}</span></div>
                        <div className="flex justify-between py-1"><span>Hard Costs</span><span>${formatNumber(analysis.sourcesUses.totalHardCosts)}</span></div>
                        <div className="flex justify-between py-1"><span>Soft Costs</span><span>${formatNumber(analysis.sourcesUses.totalSoftCosts)}</span></div>
                        <div className="flex justify-between py-1"><span>Pre-Development</span><span>${formatNumber(costs.preDevCost)}</span></div>
                        <div className={`flex justify-between py-1 font-bold border-t ${THEME.border} mt-1 ${THEME.text}`}><span>Total Uses</span><span>${formatNumber(analysis.sourcesUses.totalUses)}</span></div>
                      </div>
                      <div>
                        <h4 className={`font-bold ${THEME.textMuted} uppercase mb-2 border-b ${THEME.border} pb-1`}>Sources of Funds</h4>
                        {capitalSources.map((s, i) => (
                          <div key={s.id} className="flex justify-between py-1"><span>{i+1}. {s.name}</span><span>${formatNumber(s.amount)}</span></div>
                        ))}
                        <div className={`flex justify-between py-1 font-bold ${THEME.accentText}`}><span>Required Equity</span><span>${formatNumber(analysis.sourcesUses.equityRequired)}</span></div>
                        <div className={`flex justify-between py-1 font-bold border-t ${THEME.border} mt-1 ${THEME.text}`}><span>Total Sources</span><span>${formatNumber(analysis.financials.totalDebt + analysis.financials.equityRequired)}</span></div>
                      </div>
                   </div>
                 </Card>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className={`p-4 rounded-xl shadow-sm border ${THEME.border} ${THEME.card}`}>
                      <h3 className={`text-xs font-bold ${THEME.textMuted} uppercase mb-3`}>Target Residual Land Value</h3>
                      <div className={`text-2xl font-bold ${THEME.text}`}>${formatNumber(analysis.financials.residualLandValue)}</div>
                      <p className={`text-[10px] ${THEME.textMuted} mt-1`}>Max land price to achieve 6.5% Yield on Cost</p>
                   </div>
                   <div className={`p-4 rounded-xl shadow-sm border ${THEME.border} ${THEME.card}`}>
                      <h3 className={`text-xs font-bold ${THEME.textMuted} uppercase mb-3`}>Zoning Stats</h3>
                      <div className={`flex justify-between text-xs ${THEME.textMuted}`}>
                        <span>Height: {analysis.currentHeight}ft / {zoning.maxHeight}ft</span>
                        <span>FAR: {(analysis.usedGSF/analysis.lotArea).toFixed(2)} / {zoning.far}</span>
                      </div>
                   </div>
                 </div>
                 
                 <Card title="Detailed 15-Year Cash Flow" theme={THEME}>
                    <div className="overflow-x-auto">
                      <table className={`w-full text-xs text-right border-collapse ${THEME.name === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                         <thead className={`${THEME.name === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${THEME.textMuted} border-b ${THEME.border}`}>
                           <tr><th className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} z-10 min-w-[120px]`}>Line Item</th>{Array.from({length: 15}, (_, i) => i + 1).map(y => <th key={y} className="p-2 min-w-[80px]">Yr {y}</th>)}</tr>
                         </thead>
                         <tbody className={`divide-y ${THEME.name === 'dark' ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                           <tr><td className={`p-2 text-left font-bold sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>PGI</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className="p-2">${formatNumber(r.pgi)}</td>)}</tr>
                           <tr><td className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>Vacancy</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className={`p-2 ${THEME.textMuted}`}>(${formatNumber(r.pgi - r.egi)})</td>)}</tr>
                           <tr className={`font-bold ${THEME.name === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}><td className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>EGI</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className="p-2">${formatNumber(r.egi)}</td>)}</tr>
                           <tr><td className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>OpEx</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className="p-2 text-rose-500">(${formatNumber(r.opex)})</td>)}</tr>
                           <tr className={`font-bold border-t ${THEME.border}`}><td className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-slate-900' : 'bg-white'} ${THEME.accentText}`}>NOI</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className={`p-2 ${THEME.accentText}`}>${formatNumber(r.noi)}</td>)}</tr>
                           <tr className={`font-bold ${THEME.name === 'dark' ? 'bg-emerald-900/10' : 'bg-emerald-50'} border-t ${THEME.border}`}><td className={`p-2 text-left sticky left-0 ${THEME.name === 'dark' ? 'bg-emerald-900/10' : 'bg-emerald-50'} ${THEME.success}`}>Net CF</td>{analysis.financials.forecast.slice(1).map((r, i) => <td key={i} className={`p-2 ${THEME.success}`}>${formatNumber(r.cashFlow)}</td>)}</tr>
                         </tbody>
                      </table>
                    </div>
                 </Card>
              </div>
           </div>
        )}
        
        {/* SENSITIVITY */}
        {activeTab === 'sensitivity' && (
           <div className="flex-1 p-8 overflow-y-auto">
             <div className="max-w-4xl mx-auto">
               <h2 className={`text-2xl font-bold ${THEME.text} mb-6`}>Sensitivity Analysis</h2>
               <Card title="IRR Matrix: Exit Cap vs. Rent Growth" theme={THEME}>
                  <SensitivityMatrix baseNOI={analysis.financials.noi} baseCap={loanExitCap} baseCost={analysis.sourcesUses.totalUses} theme={THEME} />
               </Card>
             </div>
           </div>
        )}

        {/* REPORT & GIS TABS (Similar structure, just updated styles) */}
        {activeTab === 'zoning' && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
             <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
               <div className={`${THEME.card} p-8 rounded-xl flex flex-col h-full`}>
                  {/* Settings embedded here */}
                  <h2 className={`text-xl font-bold ${THEME.text} mb-4`}>Zoning & GIS</h2>
                  <div className="space-y-6">
                     {/* Manual Zoning Controls */}
                     <div className={`p-4 rounded-lg border ${THEME.border} ${THEME.name === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <label className={`text-xs font-bold ${THEME.textMuted} uppercase mb-2 flex items-center gap-2`}><ScanText size={14}/> Text Parser</label>
                        <textarea className={`${THEME.input} w-full p-2 rounded text-xs h-24 mb-2`} placeholder="Paste zoning code text here to extract values..." value={pastedZoning} onChange={e=>setPastedZoning(e.target.value)} />
                        <button onClick={parseZoningText} className="text-xs bg-slate-500 text-white px-3 py-1 rounded">Parse Specs</button>
                     </div>
                     <div>
                        <label className={`text-xs font-bold ${THEME.textMuted} uppercase mb-1 block`}>Manual District Select</label>
                        <select className={`${THEME.input} w-full p-2 rounded`} onChange={(e) => {
                             const zone = CHICAGO_ZONING_DB[e.target.value];
                             if(zone) setZoning({...zoning, ...zone, code: `Chicago ${e.target.value}`});
                        }}>
                           <option value="">Select District...</option>
                           {Object.keys(CHICAGO_ZONING_DB).map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                     </div>
                  </div>
               </div>
               <div className={`rounded-xl overflow-hidden shadow-2xl border ${THEME.border}`}>
                  {googleApiKey ? <GoogleMap apiKey={googleApiKey} address={mapAddress} zoning={zoning} lotWidth={lot.width} lotDepth={lot.depth} /> : <MockGISMap onParcelClick={(code) => { setSearchAddress("Selected Parcel"); const zone = CHICAGO_ZONING_DB[code]; if(zone) setZoning({...zoning, ...zone, code: `Chicago ${zone.code}`}); }} />}
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
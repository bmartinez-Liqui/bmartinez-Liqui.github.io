const { useState, useEffect, useMemo, useRef } = React;

const LucideIcon = ({ name, size = 18, className = "" }) => {
    const iconRef = useRef(null);
    useEffect(() => {
        if (window.lucide && iconRef.current) {
            const iconElement = document.createElement('i');
            iconElement.setAttribute('data-lucide', name);
            iconElement.style.width = `${size}px`;
            iconElement.style.height = `${size}px`;
            iconElement.className = className;
            iconRef.current.innerHTML = '';
            iconRef.current.appendChild(iconElement);
            window.lucide.createIcons({ elements: [iconElement] });
        }
    }, [name, size, className]);
    return <span ref={iconRef} className="inline-flex items-center justify-center"></span>;
};

const StatCard = ({ title, value, icon, color }) => {
    const colors = { 
        amber: "bg-amber-50 text-amber-600", 
        blue: "bg-blue-50 text-blue-600", 
        emerald: "bg-emerald-50 text-emerald-600", 
        violet: "bg-violet-50 text-violet-600",
        slate: "bg-slate-50 text-slate-500"
    };
    return (
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform text-left">
            <div className={`w-10 h-10 ${colors[color] || colors.slate} rounded-xl flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="text-left">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 leading-none">{value}</p>
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('dashboard');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    
    const [editId, setEditId] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isGanttOpen, setIsGanttOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [viewingMedia, setViewingMedia] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    const fileInputRef = useRef(null);
    const projectDetailRef = useRef(null);
    const catChartRef = useRef(null);
    const areaChartRef = useRef(null);

    // --- VARIABLES DE DATOS ---
    const [projects, setProjects] = useState([]);
    const [groups, setGroups] = useState(["General", "Operaciones", "Contabilidad", "TI", "Comercial", "Tesorería"]);
    
    // PERFIL CON IMÁGENES FIJAS LOCALES
    const [profile, setProfile] = useState({ 
        name: "Breiner Martinez", 
        title: "Analista de Datos Jr", 
        email: "bmartinez@liquitech.co", 
        bio: "Técnico en programación para analítica de datos. Especialista en transformación digital y analítica de datos en Liquitech SAS. Egresado del SENA Centro Nacional Colombo Alemán.",
        image: "image/Creador.png",
        appIcon: "image/icon.png"
    });
    
    const [categories, setCategories] = useState(["Macro", "Limpieza de datos", "Dashboard", "Ajuste de información", "Cruce de Bases", "Automatización"]);

    const [formData, setFormData] = useState({ title: '', description: '', status: 'pendiente', startDate: '', endDate: '', group: 'General', categories: [], customCategory: '' });
    const [codeData, setCodeData] = useState({ name: '', html: '' });

    // --- 1. INICIALIZACIÓN MIGRADA A INDEXED-DB ---
    useEffect(() => {
        const initData = async () => {
            try {
                let p = await localforage.getItem('breiner_repo_data');
                if (!p && localStorage.getItem('breiner_repo_data')) p = JSON.parse(localStorage.getItem('breiner_repo_data'));
                if (p) setProjects(p);

                let prof = await localforage.getItem('breiner_profile_data');
                if (!prof && localStorage.getItem('breiner_profile_data')) prof = JSON.parse(localStorage.getItem('breiner_profile_data'));
                
                // FORZAR SIEMPRE EL USO DE LAS IMÁGENES LOCALES, IGNORANDO LO GUARDADO
                const fixedProfile = prof || profile;
                fixedProfile.image = "image/Creador.png";
                fixedProfile.appIcon = "image/icon.png";
                setProfile(fixedProfile);

                let g = await localforage.getItem('breiner_groups_data');
                if (!g && localStorage.getItem('breiner_groups_data')) g = JSON.parse(localStorage.getItem('breiner_groups_data'));
                if (g) setGroups(g);

                let c = await localforage.getItem('breiner_categories_data');
                if (!c && localStorage.getItem('breiner_categories_data')) c = JSON.parse(localStorage.getItem('breiner_categories_data'));
                if (c) setCategories(c);

                setDataLoaded(true);
            } catch (e) {
                console.error("Error cargando base de datos segura:", e);
                setDataLoaded(true);
            }
        };
        initData();
    }, []);

    // --- 2. GUARDADO CONTINUO EN INDEXED-DB ---
    useEffect(() => {
        if (!dataLoaded) return;

        const saveData = async () => {
            try {
                await localforage.setItem('breiner_repo_data', projects);
                // Guardamos el perfil, pero las imágenes siempre se sobrescribirán al cargar
                await localforage.setItem('breiner_profile_data', profile);
                await localforage.setItem('breiner_groups_data', groups);
                await localforage.setItem('breiner_categories_data', categories);
            } catch (error) {
                alert("⚠️ ERROR CRÍTICO: Tu disco está lleno y no se pudo guardar en la base de datos segura.");
                console.error(error);
            }
        };
        saveData();

        if (profile.appIcon) {
            const icon = document.getElementById('app-favicon');
            if (icon) icon.href = profile.appIcon;
        }

        if (view === 'dashboard') {
            setTimeout(renderCharts, 100);
        }
    }, [projects, profile, groups, categories, view, dataLoaded]);

    const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const stats = useMemo(() => {
        const total = projects.length;
        const completed = projects.filter(p => p.status === 'completado').length;
        const inProgress = projects.filter(p => p.status === 'en-progreso').length;
        const pending = projects.filter(p => p.status === 'pendiente').length;
        const avgProgress = total ? Math.round(projects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0) / total) : 0;
        const activeAreas = new Set(projects.map(p => p.group)).size;
        return { total, completed, inProgress, pending, avgProgress, activeAreas };
    }, [projects]);

    // --- Gráficos ---
    const renderCharts = () => {
        const ctxCat = document.getElementById('categoryChart');
        if (ctxCat) {
            if (catChartRef.current) catChartRef.current.destroy();
            const catCounts = {};
            projects.forEach(p => (p.categories || []).forEach(c => catCounts[c] = (catCounts[c] || 0) + 1));
            
            catChartRef.current = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catCounts).length ? Object.keys(catCounts) : ['Sin datos'],
                    datasets: [{
                        data: Object.values(catCounts).length ? Object.values(catCounts) : [1],
                        backgroundColor: ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'],
                        borderWidth: 0, cutout: '70%'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, family: 'Montserrat' } } } } }
            });
        }

        const ctxArea = document.getElementById('areaChart');
        if (ctxArea) {
            if (areaChartRef.current) areaChartRef.current.destroy();
            const areaCounts = {};
            groups.forEach(g => areaCounts[g] = projects.filter(p => p.group === g).length);

            areaChartRef.current = new Chart(ctxArea, {
                type: 'bar',
                data: {
                    labels: Object.keys(areaCounts),
                    datasets: [{
                        label: 'Proyectos',
                        data: Object.values(areaCounts),
                        backgroundColor: '#7c3aed',
                        borderRadius: 4,
                        barThickness: 30
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    };

    // --- Handlers ---
    const handleSaveProject = (e) => {
        e.preventDefault();
        let finalCats = [...(formData.categories || [])];
        
        if (editId) {
            setProjects(prev => prev.map(p => {
                if (p.id === editId) {
                    let newProg = p.progress || 0;
                    if (formData.status === 'pendiente') newProg = Math.min(newProg, 30);
                    else if (formData.status === 'en-progreso') newProg = Math.max(31, Math.min(newProg, 90));
                    else if (formData.status === 'completado') newProg = 100;

                    return { ...p, ...formData, categories: finalCats, progress: newProg };
                }
                return p;
            }));
        } else {
            const newProj = {
                id: Date.now(), 
                ...formData, 
                categories: finalCats,
                progress: formData.status === 'completado' ? 100 : (formData.status === 'en-progreso' ? 31 : 0),
                files: [], notes: [], codes: []
            };
            setProjects([newProj, ...projects]);
        }
        setIsModalOpen(false);
        setEditId(null);
    };

    const updateProgress = (id, val) => {
        setProjects(prev => prev.map(p => {
            if (p.id === id) {
                let finalVal = parseInt(val);
                if (p.status === 'pendiente') finalVal = Math.min(finalVal, 30);
                else if (p.status === 'en-progreso') finalVal = Math.max(31, Math.min(finalVal, 90));
                else if (p.status === 'completado') finalVal = 100;
                return { ...p, progress: finalVal };
            }
            return p;
        }));
    };

    const exportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", `Backup_Repo.json`);
        dl.click();
    };

    const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    setProjects(data);
                    alert("¡Información importada con éxito!");
                }
            } catch (err) { alert("Error al procesar archivo."); }
        };
        reader.readAsText(file);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const MAX_SIZE = 25 * 1024 * 1024; // 25MB Límite
        
        files.forEach(file => {
            if (file.size > MAX_SIZE) {
                alert(`¡Atención! El archivo "${file.name}" supera el límite de 25MB para protección de memoria.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const newFile = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: file.type || 'unknown',
                    data: reader.result 
                };
                setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, files: [...(p.files || []), newFile] } : p));
            };
            reader.readAsDataURL(file);
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const deleteFile = (fileId) => {
        if(!confirm('¿Eliminar este archivo?')) return;
        setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, files: (p.files || []).filter(f => f.id !== fileId) } : p));
    };

    const addNote = (projectId, text) => {
        if(!text.trim()) return;
        const note = { id: Date.now(), text, date: new Date().toLocaleString() };
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, notes: [note, ...(p.notes || [])] } : p));
    };

    const handleAddCode = (e) => {
        e.preventDefault();
        const newCode = { id: Date.now(), name: codeData.name, html: codeData.html, date: new Date().toLocaleDateString() };
        setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, codes: [...(p.codes || []), newCode] } : p));
        setIsCodeModalOpen(false);
        setCodeData({ name: '', html: '' });
    };

    const runTool = (htmlContent) => {
        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) alert("Tu navegador bloqueó la ventana. Por favor, permite las ventanas emergentes (pop-ups).");
        } catch(e) {
            alert("Error al ejecutar el código HTML.");
        }
    };

    const exportToPDF = (project) => {
        setIsExporting(true);
        setTimeout(() => {
            const element = projectDetailRef.current;
            html2pdf().from(element).set({ margin: 10, filename: `Repo_${project.title}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save().then(() => setIsExporting(false));
        }, 100);
    };

    // --- Loading State ---
    if (!dataLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4 fade-in">
                <LucideIcon name="database" size={48} className="text-violet-600 animate-bounce" />
                <h2 className="text-xl font-bold text-slate-800 tracking-widest uppercase">Iniciando Base de Datos Segura</h2>
            </div>
        );
    }

    // --- Sub-renderers ---
    const renderCalendarWidget = () => (
        <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col text-left">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-800">Calendario</h3>
                <button onClick={() => setIsGanttOpen(true)} className="hover:scale-110 transition-transform">
                    <LucideIcon name="maximize-2" size={14} className="text-violet-600" />
                </button>
            </div>
            <div className="calendar-grid-container text-center text-[9px] text-slate-400 font-bold mb-1">
                {['D','L','M','M','J','V','S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="calendar-grid-container flex-1">
                {Array.from({length: 31}, (_, i) => (
                    <div key={i} className="h-7 flex flex-col items-center justify-center rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                        {i + 1}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderBigCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = new Date(year, month, 1).getDay();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blanks = Array.from({ length: startDay }, (_, i) => null);

        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left">
                    <div className="p-4 md:p-5 border-b flex flex-col sm:flex-row justify-between items-center bg-white gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                            <h2 className="text-base md:text-lg font-bold text-slate-800">Calendario</h2>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white rounded-lg transition-colors"><LucideIcon name="chevron-left" /></button>
                                <span className="font-bold min-w-[100px] text-center text-xs capitalize">{currentDate.toLocaleString('es-ES', { month: 'short', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white rounded-lg transition-colors"><LucideIcon name="chevron-right" /></button>
                            </div>
                        </div>
                        <button onClick={() => setIsGanttOpen(false)} className="p-2 hover:bg-slate-100 rounded-full hidden sm:block"><LucideIcon name="x" /></button>
                        <button onClick={() => setIsGanttOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full sm:hidden"><LucideIcon name="x" size={14}/></button>
                    </div>
                    <div className="flex-1 overflow-auto p-3 md:p-5 bg-slate-50">
                        <div className="grid grid-cols-7 bg-slate-900 text-white rounded-t-lg text-center py-2 text-[9px] md:text-[10px] font-bold uppercase">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => <div key={i}>{d}</div>)}
                        </div>
                        <div className="big-calendar-grid">
                            {[...blanks, ...days].map((d, i) => {
                                if (d === null) return <div key={`blank-${i}`} className="big-calendar-cell bg-slate-50"></div>;
                                const active = projects.filter(p => {
                                    if(!p.startDate) return false;
                                    const s = new Date(p.startDate); s.setHours(0,0,0,0);
                                    const e = new Date(p.endDate || p.startDate); e.setHours(23,59,59);
                                    const cellDate = new Date(year, month, d);
                                    return cellDate >= s && cellDate <= e;
                                });
                                return (
                                    <div key={`day-${i}`} className="big-calendar-cell group text-left">
                                        <span className="text-[10px] font-bold text-slate-400 mb-1">{d}</span>
                                        <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                            {active.map(p => (<div key={p.id} className={`project-tag-bar p-color-${p.id.toString().length % 5} truncate`}>{p.title}</div>))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProjectDetail = () => {
        const progValue = currentProject.progress || 0;
        const mediaFiles = (currentProject.files || []).filter(f => f.type && (f.type.startsWith('image/') || f.type.startsWith('video/')));
        const docs = (currentProject.files || []).filter(f => !f.type || (!f.type.startsWith('image/') && !f.type.startsWith('video/')));
        const limits = currentProject.status === 'pendiente' ? {min:0, max:30} : currentProject.status === 'en-progreso' ? {min:31, max:90} : {min:91, max:100};

        return (
            <div className="fade-in space-y-6 text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                    <button onClick={() => {setView('projects'); setSelectedProjectId(null);}} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-violet-600 transition-all text-left">
                        <LucideIcon name="arrow-left" size={14}/> Volver a proyectos
                    </button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => { 
                            setEditId(currentProject.id);
                            setFormData({
                                title: currentProject.title, description: currentProject.description, 
                                status: currentProject.status, startDate: currentProject.startDate, 
                                endDate: currentProject.endDate, group: currentProject.group || 'General',
                                categories: currentProject.categories || []
                            }); 
                            setIsModalOpen(true); 
                        }} className="flex-1 sm:flex-none p-2 bg-slate-100 text-slate-600 hover:text-violet-600 rounded-xl border border-slate-200 shadow-sm flex justify-center"><LucideIcon name="settings" size={18}/></button>
                        <button onClick={() => exportToPDF(currentProject)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] uppercase border border-red-100 hover:bg-red-100 transition-all shadow-sm"><LucideIcon name="file-text" size={14}/> PDF</button>
                    </div>
                </div>

                <div ref={projectDetailRef} className="pdf-content grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 text-left">
                    {/* Panel Izquierdo: Info y Notas */}
                    <div className="lg:col-span-2 space-y-6 md:space-y-8 text-left">
                        <div className="bg-white rounded-[2rem] p-6 md:p-10 border shadow-sm relative overflow-hidden text-left text-sharp">
                            <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-violet-50/50 rounded-bl-[10rem] -mr-16 -mt-16 no-print text-left"></div>
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 relative z-10 text-left">
                                <div className="flex flex-wrap gap-2 text-left">
                                    {(currentProject.categories || []).map(cat => <span key={cat} className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-[9px] font-bold uppercase border border-violet-100">{cat}</span>)}
                                </div>
                                <select value={currentProject.status} onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setProjects(prev => prev.map(p => {
                                        if (p.id === currentProject.id) {
                                            let newProg = p.progress || 0;
                                            if (newStatus === 'pendiente') newProg = Math.min(newProg, 30);
                                            else if (newStatus === 'en-progreso') newProg = Math.max(31, Math.min(newProg, 90));
                                            else if (newStatus === 'completado') newProg = 100;
                                            return { ...p, status: newStatus, progress: newProg };
                                        }
                                        return p;
                                    }));
                                }} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase outline-none cursor-pointer border shadow-sm transition-all ${currentProject.status === 'pendiente' ? 'status-badge-pendiente' : currentProject.status === 'en-progreso' ? 'status-badge-en-progreso' : 'status-badge-completado'}`}>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en-progreso">En progreso</option>
                                    <option value="completado">Completado</option>
                                </select>
                            </div>

                            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900 leading-tight text-left">{currentProject.title}</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed text-xs md:text-sm font-medium text-left">{currentProject.description}</p>
                            
                            <div className="space-y-4 pt-6 border-t border-slate-50 text-left">
                                <div className="flex justify-between font-bold text-[10px] md:text-[11px] uppercase text-slate-400"><span>Avance estratégico</span><span className="text-violet-600 font-black text-lg md:text-xl">{progValue}%</span></div>
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-[9px] font-bold text-slate-300 w-6 text-right">{limits.min}%</span>
                                    <input type="range" min={limits.min} max={limits.max} value={progValue} onChange={(e) => updateProgress(currentProject.id, e.target.value)} className="dynamic-slider flex-1 no-print" style={{ background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${Math.max(0, ((progValue - limits.min) / (limits.max - limits.min)) * 100)}%, #f1f5f9 ${Math.max(0, ((progValue - limits.min) / (limits.max - limits.min)) * 100)}%, #f1f5f9 100%)` }} />
                                    <span className="text-[9px] font-bold text-slate-300 w-8">{limits.max}%</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-8 text-left">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left"><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-left">Inicio</label><span className="font-bold text-slate-700 text-xs md:text-sm text-left">{currentProject.startDate || '---'}</span></div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left"><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-left">Cierre</label><span className="font-bold text-slate-700 text-xs md:text-sm text-left">{currentProject.endDate || '---'}</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 md:p-8 border shadow-sm text-left">
                            <h3 className="text-base md:text-lg font-bold mb-6 flex items-center gap-3 text-slate-800"><LucideIcon name="edit-3" className="text-violet-500"/> Notas de Avance</h3>
                            <div className="flex flex-col sm:flex-row gap-2 mb-8 no-print text-left">
                                <input id="noteInp" className="flex-1 bg-slate-50 p-3 md:p-4 rounded-xl border-none outline-none font-medium text-xs md:text-sm text-left shadow-inner" placeholder="Registrar avance operativo..." />
                                <button onClick={() => { const inp = document.getElementById('noteInp'); addNote(currentProject.id, inp.value); inp.value = ''; }} className="bg-slate-900 text-white p-3 md:px-8 md:py-0 rounded-xl font-bold text-[10px] uppercase hover:bg-violet-600 transition-all text-sharp">Publicar</button>
                            </div>
                            <div className="space-y-4 md:space-y-6">
                                {(currentProject.notes || []).map(n => (
                                    <div key={n.id} className="p-4 md:p-6 bg-slate-50 rounded-2xl border-l-4 border-violet-400 group flex flex-col sm:flex-row justify-between items-start text-left text-sharp gap-4">
                                        <div className="flex-1 text-left w-full">
                                            {editingNoteId === n.id ? (
                                                <div className="flex gap-2 text-left text-sharp w-full">
                                                    <input id={`edit-note-${n.id}`} defaultValue={n.text} className="flex-1 p-2 bg-white rounded border outline-none text-xs md:text-sm font-medium text-left shadow-sm w-full" />
                                                    <button onClick={() => { const v = document.getElementById(`edit-note-${n.id}`).value; setProjects(prev => prev.map(p => p.id === currentProject.id ? {...p, notes: p.notes.map(x => x.id === n.id ? {...x, text: v} : x)} : p)); setEditingNoteId(null); }} className="p-2 bg-emerald-500 text-white rounded shadow-sm text-left shrink-0"><LucideIcon name="check" size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="text-left">
                                                    <p className="font-medium text-slate-700 text-xs md:text-sm leading-relaxed text-left text-sharp">{n.text}</p>
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase mt-2 block tracking-widest text-left text-sharp">{n.date}</span>
                                                </div>
                                            )}
                                        </div>
                                        {!editingNoteId && (
                                            <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all text-left">
                                                <button onClick={() => setEditingNoteId(n.id)} className="p-2 sm:p-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none text-slate-400 sm:text-slate-300 hover:text-violet-600 shadow-sm sm:shadow-none"><LucideIcon name="edit-3" size={14}/></button>
                                                <button onClick={() => setProjects(prev => prev.map(p => p.id === currentProject.id ? {...p, notes: p.notes.filter(x => x.id !== n.id)} : p))} className="p-2 sm:p-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none text-slate-400 sm:text-slate-300 hover:text-red-500 shadow-sm sm:shadow-none"><LucideIcon name="trash-2" size={14}/></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Panel Derecha: Galería y Motor */}
                    <div className="space-y-6 text-left">
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 border shadow-sm text-left">
                            <div className="flex justify-between items-center mb-6 text-left">
                                <h3 className="text-base md:text-lg font-bold flex items-center gap-3 text-slate-800 text-left"><LucideIcon name="image" className="text-violet-500"/> Galería</h3>
                                <button onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-violet-600 hover:text-white transition-all no-print shadow-sm"><LucideIcon name="plus" size={16}/></button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple accept="image/*, video/*, application/pdf, .doc,.docx,.xls,.xlsx" />
                            </div>
                            
                            {currentProject.files?.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3 md:gap-4 text-left">
                                    {/* Render Multimedia */}
                                    {mediaFiles.map(media => (
                                        <div key={media.id} className="gallery-item group shadow-sm bg-slate-50 flex items-center justify-center relative rounded-xl overflow-hidden aspect-square border border-slate-100">
                                            {media.type.startsWith('video/') ? (
                                                <video src={media.data} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <img src={media.data} alt={media.name} className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 no-print">
                                                <button onClick={() => setViewingMedia(media)} className="p-2 bg-violet-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Ver archivo"><LucideIcon name="eye" size={12}/></button>
                                                <button onClick={() => deleteFile(media.id)} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Eliminar"><LucideIcon name="trash-2" size={12}/></button>
                                            </div>
                                            {media.type.startsWith('video/') && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 text-white p-1 rounded-lg backdrop-blur-md"><LucideIcon name="video" size={10}/></div>
                                            )}
                                        </div>
                                    ))}
                                    {/* Render Documentos */}
                                    {docs.map(doc => (
                                        <div key={doc.id} className="flex flex-col items-center justify-center p-2 md:p-4 bg-slate-50 text-center group rounded-xl border border-slate-100 relative aspect-square">
                                            <LucideIcon name="file-text" size={24} className="text-slate-300 mb-1 md:mb-2"/>
                                            <p className="text-[7px] md:text-[8px] font-bold uppercase truncate w-full px-1 md:px-2 text-slate-500">{doc.name}</p>
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 md:gap-2 no-print rounded-xl">
                                                <a href={doc.data} download={doc.name} className="p-2 bg-violet-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Descargar"><LucideIcon name="download" size={12}/></a>
                                                <button onClick={() => deleteFile(doc.id)} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Eliminar"><LucideIcon name="trash-2" size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 md:py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 text-left"><LucideIcon name="camera" size={28} className="mb-2 opacity-20" /><p className="font-bold uppercase text-[9px] tracking-widest text-left">Sin archivos</p></div>
                            )}
                        </div>

                        <div className="bg-violet-600 rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-violet-100 text-left">
                            <div className="flex justify-between items-center mb-6 text-left">
                                <div className="text-left">
                                    <h3 className="text-base md:text-lg font-bold mb-1">Motor</h3>
                                    <p className="text-[8px] md:text-[9px] uppercase font-bold text-violet-200 tracking-widest leading-none">Ejecución HTML</p>
                                </div>
                                <button onClick={() => setIsCodeModalOpen(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all no-print shadow-sm"><LucideIcon name="plus" size={18}/></button>
                            </div>
                            <div className="space-y-3">
                                {(currentProject.codes || []).map(c => (
                                    <div key={c.id} className="bg-white p-3 md:p-4 rounded-2xl flex items-center justify-between group shadow-sm text-slate-800 text-left">
                                        <div className="overflow-hidden pr-2 text-left"><p className="text-[10px] md:text-xs font-bold truncate text-left">{c.name}</p><p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase text-left">{c.date}</p></div>
                                        <div className="flex gap-1 md:gap-2 shrink-0 text-left">
                                            <button onClick={() => runTool(c.html)} className="w-7 h-7 md:w-8 md:h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center hover:bg-violet-600 hover:text-white transition-all shadow-sm"><LucideIcon name="play" size={12}/></button>
                                            <button onClick={() => setProjects(prev => prev.map(p => p.id === selectedProjectId ? {...p, codes: p.codes.filter(x => x.id !== c.id)} : p))} className="w-7 h-7 md:w-8 md:h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white sm:opacity-0 group-hover:opacity-100 transition-all shadow-sm"><LucideIcon name="trash-2" size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProfile = () => (
        <div className="fade-in max-w-4xl mx-auto py-6 text-left text-sharp">
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border shadow-xl flex flex-col md:flex-row gap-8 md:gap-12 relative overflow-hidden text-left">
                <div className="absolute top-[-100px] right-[-100px] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-violet-50 rounded-full blur-[80px] md:blur-[100px] opacity-60"></div>
                <div className="profile-img-container flex-shrink-0 flex items-center justify-center z-10 bg-white p-1 mx-auto md:mx-0 w-24 h-24 md:w-[110px] md:h-[110px]">
                    <img src={profile.image} className="w-full h-full object-cover rounded-[1rem] md:rounded-[1.5rem]" alt="Creador" />
                </div>
                <div className="flex-1 z-10 space-y-6 text-left text-center md:text-left">
                    <div className="text-sharp">
                        <h2 className="text-3xl md:text-5xl font-black mb-1 uppercase italic text-slate-900 tracking-tighter leading-none">{profile.name}</h2>
                        <p className="text-violet-600 font-bold text-sm md:text-lg uppercase tracking-[2px] md:tracking-[3px] mt-2 md:mt-3">{profile.title}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-sharp text-left">
                        <div className="bg-slate-50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
                            <h3 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Trayectoria</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sharp"><LucideIcon name="briefcase" size={14} className="text-violet-600"/><span className="text-[10px] md:text-xs font-bold text-slate-700">Liquitech SAS</span></div>
                                <div className="flex items-center gap-3 text-sharp"><LucideIcon name="graduation-cap" size={14} className="text-violet-600"/><span className="text-[10px] md:text-xs font-bold text-slate-700">SENA Colombo Alemán</span></div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
                            <h3 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 uppercase">Educación</h3>
                            <p className="text-[10px] md:text-xs font-bold text-slate-700 leading-snug">Técnico en programación para analítica de datos</p>
                            <div className="flex items-center gap-2 mt-4 text-[9px] md:text-[10px] font-bold text-violet-600 uppercase leading-none"><LucideIcon name="mail" size={12}/> {profile.email}</div>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 text-left shadow-xl">
                        <h3 className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 md:mb-4 text-left">Misión Estratégica</h3>
                        <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-medium italic text-left">"{profile.bio}"</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderConfigPanel = () => (
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 py-4 md:py-6 fade-in text-left text-sharp">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b pb-6 md:pb-10 border-slate-100 text-sharp text-left gap-4">
                <div><h2 className="text-3xl md:text-4xl font-black text-slate-900">Configuración</h2><p className="text-slate-400 text-sm md:text-lg italic mt-1">Panel administrativo de identidad y datos.</p></div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto">
                    <button onClick={exportData} className="flex-1 sm:flex-none px-4 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:bg-violet-700 shadow-xl transition-all shadow-sm"><LucideIcon name="download" size={14}/> Extraer JSON</button>
                    <label className="flex-1 sm:flex-none px-4 md:px-8 py-3 md:py-4 bg-white border border-slate-200 text-slate-600 rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:bg-slate-50 transition-all shadow-sm cursor-pointer shadow-sm">
                        <LucideIcon name="upload" size={14}/> Importar
                        <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 text-left text-sharp">
                <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8 text-left">
                    <div className="flex justify-between items-center text-sharp text-left">
                        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-sharp text-left"><LucideIcon name="user" className="text-violet-500"/> Identidad Visual</h3>
                    </div>
                    
                    <div className="space-y-4 md:space-y-6 text-left fade-in">
                        <div className="flex items-center gap-4 md:gap-6 p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 text-left">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden flex items-center justify-center text-left">
                                <img src={profile.image} className="w-full h-full object-cover" alt="Creador" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-800 uppercase tracking-widest">Foto del Creador</p>
                                <p className="text-[7px] md:text-[8px] text-slate-400 uppercase mt-1">image/Creador.png</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 text-left">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden flex items-center justify-center text-left">
                                <img src={profile.appIcon} className="w-full h-full object-cover" alt="Icono App" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-800 uppercase tracking-widest">Icono de la App</p>
                                <p className="text-[7px] md:text-[8px] text-slate-400 uppercase mt-1">image/icon.png</p>
                            </div>
                        </div>
                        <div className="pt-2 md:pt-4 text-left text-sharp">
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-2 md:mb-3 block tracking-widest text-left text-sharp">Biografía Estratégica (Bio)</label>
                            <textarea value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} className="w-full p-4 md:p-5 bg-slate-50 border-none rounded-xl md:rounded-2xl text-xs md:text-sm font-medium outline-none focus:ring-4 focus:ring-violet-50 text-sharp" rows="5"></textarea>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border shadow-sm text-left text-sharp text-sharp">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 mb-6 md:mb-8 text-slate-800"><LucideIcon name="folder-git-2" className="text-violet-500"/> Áreas Operativas</h3>
                    <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-sharp">
                        {groups.map((g, i) => (
                            <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl group hover:bg-violet-50 transition-all border border-transparent hover:border-violet-100 text-left text-sharp shadow-sm"><span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase tracking-widest text-left">{g}</span><button onClick={() => setGroups(groups.filter(x => x !== g))} className="text-slate-300 hover:text-red-500 transition-colors"><LucideIcon name="trash-2" size={14}/></button></div>
                        ))}
                    </div>
                    <div className="flex gap-2 md:gap-3 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-50 text-left">
                        <input id="newGrp" className="flex-1 bg-slate-50 border-none p-3 md:p-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-violet-100 transition-all shadow-inner text-left" placeholder="Nueva área..." />
                        <button onClick={() => {const v=document.getElementById('newGrp'); if(v.value){setGroups([...groups, v.value]); v.value=''}}} className="bg-slate-900 text-white px-4 md:px-6 rounded-xl md:rounded-2xl shadow-lg hover:bg-violet-600 transition-all"><LucideIcon name="plus" size={16}/></button>
                    </div>
                </div>
                
                <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border shadow-sm text-left text-sharp">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 mb-6 md:mb-8 text-slate-800"><LucideIcon name="paperclip" className="text-violet-500"/> Etiquetas</h3>
                    <div className="flex flex-wrap gap-2 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-sharp">
                        {categories.map((c, i) => (
                            <div key={i} className="px-3 py-1.5 md:px-4 md:py-2 bg-violet-50 text-violet-600 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase flex items-center gap-2 md:gap-3 border border-violet-100 shadow-sm transition-all hover:bg-violet-100 text-left">{c}<button onClick={() => setCategories(categories.filter(x => x !== c))} className="text-violet-300 hover:text-red-500"><LucideIcon name="x" size={10}/></button></div>
                        ))}
                    </div>
                    <div className="flex gap-2 md:gap-3 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-50 text-left">
                        <input id="newCat" className="flex-1 bg-slate-50 border-none p-3 md:p-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-violet-100 transition-all shadow-inner text-left" placeholder="Nueva etiqueta..." />
                        <button onClick={() => {const v=document.getElementById('newCat'); if(v.value){setCategories([...categories, v.value]); v.value=''}}} className="bg-slate-900 text-white px-4 md:px-6 rounded-xl md:rounded-2xl shadow-lg hover:bg-violet-600 transition-all"><LucideIcon name="plus" size={16}/></button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col selection:bg-violet-100 selection:text-violet-800 text-left pb-16 md:pb-0">
            <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 md:px-8 h-14 md:h-16 flex items-center justify-between shadow-sm text-left">
                <div className="flex items-center gap-3 md:gap-10 text-left">
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer text-left" onClick={() => {setView('dashboard'); setSelectedProjectId(null);}}>
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white shadow-xl overflow-hidden shrink-0">
                            <img src={profile.appIcon} className="w-full h-full object-cover" alt="Logo"/>
                        </div>
                        <span className="text-sm md:text-lg font-bold text-left tracking-tight truncate">Liquitech / <span className="text-violet-600 text-left">Repo</span></span>
                    </div>
                    
                    {/* MENÚ DE ESCRITORIO (Oculto en móviles) */}
                    <div className="hidden md:flex gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-[2px] text-left">
                        <button onClick={() => {setView('dashboard');}} className={view === 'dashboard' ? 'text-violet-600 border-b-2 border-violet-600 py-5' : 'py-5 hover:text-slate-600 transition-colors'}>Dashboard</button>
                        <button onClick={() => {setView('projects');}} className={(view === 'projects' || view === 'project-detail') ? 'text-violet-600 border-b-2 border-violet-600 py-5' : 'py-5 hover:text-slate-600 transition-colors'}>Proyectos</button>
                        <button onClick={() => {setView('profile');}} className={view === 'profile' ? 'text-violet-600 border-b-2 border-violet-600 py-5' : 'py-5 hover:text-slate-600 transition-colors'}>Creador</button>
                        <button onClick={() => setView('config')} className={view === 'config' ? 'text-violet-600 border-b-2 border-violet-600 py-5' : 'py-5 hover:text-slate-600 transition-colors'}>Configuración</button>
                    </div>
                </div>
                <button onClick={() => {setEditId(null); setFormData({title: '', description: '', status: 'pendiente', startDate: '', endDate: '', group: 'General', categories: []}); setIsModalOpen(true);}} className="bg-slate-900 text-white px-3 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-bold uppercase tracking-widest hover:bg-violet-700 shadow-xl active:scale-95 transition-all text-left text-sharp whitespace-nowrap">Nuevo Proyecto</button>
            </nav>

            <main className="app-container py-6 md:py-10 flex-1 text-left text-sharp">
                {view === 'dashboard' && (
                    <div className="space-y-6 md:space-y-10 fade-in text-left text-sharp">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
                            <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border shadow-sm flex flex-col justify-center text-left relative overflow-hidden group text-sharp">
                                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-violet-50/30 rounded-bl-full"></div>
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4 md:mb-5 leading-tight text-left">Sistema de <br/><span className="text-violet-600 italic">Gestión de Proyectos.</span></h1>
                                <p className="text-slate-400 text-sm md:text-lg max-w-xl font-medium leading-relaxed text-left text-sharp">Herramienta centralizada diseñada para manejar de una mejor manera tus tareas, optimizar flujos de trabajo y garantizar el éxito de cada desarrollo digital en Liquitech SAS.</p>
                            </div>
                            <div className="lg:col-span-4 h-full text-left">{renderCalendarWidget()}</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left text-sharp text-sharp">
                            <StatCard title="Pendientes" value={stats.pending} icon={<LucideIcon name="clock"/>} color="slate" />
                            <StatCard title="En Proceso" value={stats.inProgress} icon={<LucideIcon name="play"/>} color="amber" />
                            <StatCard title="Completados" value={stats.completed} icon={<LucideIcon name="check-circle-2"/>} color="emerald" />
                            <StatCard title="Total" value={stats.total} icon={<LucideIcon name="database"/>} color="violet" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 text-left">
                            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border shadow-sm h-[300px] md:h-[400px] flex flex-col text-left">
                                <h3 className="text-[10px] md:text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 md:mb-8 text-left">Categorías Usadas</h3>
                                <div className="flex-1 relative text-left"><canvas id="categoryChart"></canvas></div>
                            </div>
                            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border shadow-sm h-[300px] md:h-[400px] flex flex-col text-left text-sharp">
                                <h3 className="text-[10px] md:text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 md:mb-8 text-left">Proyectos por Área</h3>
                                <div className="flex-1 relative text-left text-sharp"><canvas id="areaChart"></canvas></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border shadow-sm text-left">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-10 text-left">
                                <div className="text-left text-sharp"><h3 className="text-xl md:text-2xl font-black text-slate-800 text-left">Progreso Total del Repositorio</h3><p className="text-[9px] md:text-[11px] text-slate-400 mt-2 uppercase font-black tracking-widest text-left">Avance ponderado de todas las soluciones desarrolladas</p></div>
                                <span className="text-5xl md:text-7xl font-black text-violet-600 italic leading-none text-left sm:text-right">{stats.avgProgress}%</span>
                            </div>
                            <div className="h-4 md:h-6 bg-slate-50 rounded-full overflow-hidden p-1 shadow-inner text-left"><div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-1000 shadow-xl text-left" style={{ width: `${stats.avgProgress}%` }}></div></div>
                        </div>
                    </div>
                )}

                {view === 'projects' && (
                    <div className="fade-in space-y-8 md:space-y-10 text-left text-sharp text-sharp">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 uppercase italic text-left">Mis <span className="text-violet-600 not-italic text-left">Soluciones</span></h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-left text-sharp">
                            {projects.map(p => (
                                <div key={p.id} onClick={() => {setSelectedProjectId(p.id); setView('project-detail')}} className="card-pro p-6 md:p-8 cursor-pointer group flex flex-col h-full text-left text-sharp">
                                    <div className="flex justify-between items-start mb-6 md:mb-8 text-left text-sharp"><span className={`px-3 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase shadow-sm ${p.status === 'completado' ? 'status-badge-completado' : p.status === 'en-progreso' ? 'status-badge-en-progreso' : 'status-badge-pendiente'}`}>{p.status.replace('-', ' ')}</span><button onClick={(e) => {e.stopPropagation(); if(confirm('¿Eliminar?')) setProjects(projects.filter(x => x.id !== p.id))}} className="text-slate-200 hover:text-red-500 transition-all transform hover:scale-110 text-left text-sharp"><LucideIcon name="trash-2" size={16}/></button></div>
                                    <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 group-hover:text-violet-600 transition-colors leading-tight text-left text-sharp">{p.title}</h3>
                                    <p className="text-slate-400 text-xs md:text-sm line-clamp-3 h-12 md:h-15 mb-6 md:mb-8 font-medium leading-relaxed text-left text-sharp">{p.description}</p>
                                    <div className="mt-auto flex items-center justify-between pt-4 md:pt-6 border-t border-slate-50 text-left text-sharp"><div className="text-violet-600 font-black italic text-lg md:text-xl text-left">{p.progress}%</div><div className="flex items-center gap-1 md:gap-2 text-left"><LucideIcon name="paperclip" size={12} className="text-slate-300"/><span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{(p.files || []).length} archivos</span></div></div>
                                    <div className="h-1.5 md:h-2 bg-slate-50 rounded-full mt-3 md:mt-4 overflow-hidden text-left text-sharp"><div className="h-full bg-violet-600 rounded-full transition-all duration-500 text-left" style={{ width: `${p.progress}%` }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'project-detail' && currentProject && renderProjectDetail()}
                {view === 'profile' && renderProfile()}
                {view === 'config' && renderConfigPanel()}
            </main>

            {/* MENÚ DE NAVEGACIÓN INFERIOR (Solo visible en móviles) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <button onClick={() => {setView('dashboard');}} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}>
                    <LucideIcon name="layout-dashboard" size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Inicio</span>
                </button>
                <button onClick={() => {setView('projects');}} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'projects' || view === 'project-detail' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}>
                    <LucideIcon name="folder-git-2" size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Proyectos</span>
                </button>
                <button onClick={() => {setView('profile');}} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'profile' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}>
                    <LucideIcon name="user" size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Creador</span>
                </button>
                <button onClick={() => setView('config')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'config' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}>
                    <LucideIcon name="settings" size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Ajustes</span>
                </button>
            </div>

            {/* Modal Crear/Editar Proyecto */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-6 text-left">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-left h-auto max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-white text-left text-sharp text-left shrink-0"><h3 className="text-xl md:text-2xl font-black uppercase text-slate-800 tracking-tighter text-left">{editId ? 'Editar' : 'Nueva'} <span className="text-violet-600 text-left">Solución</span></h3><button onClick={() => setIsModalOpen(false)} className="hover:text-red-500 transition-colors text-left"><LucideIcon name="x" size={24}/></button></div>
                        <form onSubmit={handleSaveProject} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar text-left text-sharp flex-1">
                            <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Título</label><input required name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-none outline-none font-bold text-base md:text-lg focus:ring-4 focus:ring-violet-50 text-left text-sharp" placeholder="Ej: Automatización Conciliación" /></div>
                            <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Descripción</label><textarea required name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl outline-none border-none h-24 md:h-32 font-medium text-sm focus:ring-4 focus:ring-violet-50 text-left text-sharp" placeholder="Detalla el impacto..." /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-left">
                                <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Estado Inicial</label><select name="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-none font-bold text-violet-600 text-sm outline-none appearance-none cursor-pointer text-left text-sharp"><option value="pendiente">Pendiente</option><option value="en-progreso">En progreso</option><option value="completado">Completado</option></select></div>
                                <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left text-sharp">Área</label><select name="group" value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})} className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-none font-bold text-sm outline-none text-left appearance-none cursor-pointer text-sharp">{groups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                            </div>
                            <div className="space-y-2 text-left text-sharp">
                                <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Etiquetas (Categorías)</label>
                                <div className="flex flex-wrap gap-2 text-left text-sharp">
                                    {categories.map(c => (
                                        <div key={c} onClick={() => { const curr = formData.categories || []; setFormData({...formData, categories: curr.includes(c) ? curr.filter(x => x !== c) : [...curr, c]}); }} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase cursor-pointer border-2 transition-all ${formData.categories?.includes(c) ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:border-violet-200'}`}>{c}</div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sharp">
                                <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Inicio</label><input type="date" name="startDate" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border-none font-bold text-slate-700 text-sm outline-none text-left" /></div>
                                <div className="space-y-2 text-left text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 md:ml-2 text-left">Cierre</label><input type="date" name="endDate" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border-none font-bold text-slate-700 text-sm outline-none text-left" /></div>
                            </div>
                            <div className="pt-4 md:pt-6 flex flex-col sm:flex-row justify-end gap-4 items-center text-left text-sharp shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto font-bold text-slate-400 text-xs uppercase tracking-widest hover:text-slate-800 py-3 text-center transition-colors">Cancelar</button>
                                <button type="submit" className="w-full sm:w-auto bg-violet-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-3xl font-bold text-xs shadow-xl md:shadow-2xl hover:bg-violet-700 transition-all uppercase tracking-widest text-center">Guardar Solución</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Código HTML */}
            {isCodeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[400] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden fade-in flex flex-col text-left">
                        <div className="p-6 md:p-10 border-b-2 border-slate-50 flex justify-between items-center bg-white text-left text-sharp text-sharp text-sharp text-sharp"><div className="flex flex-col text-left text-sharp"><h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase text-left text-sharp">Nueva <span className="text-violet-600 not-italic text-left text-sharp">Versión</span></h3><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-1 md:mt-2 tracking-widest text-left text-sharp">Motor ejecutable (HTML)</span></div><button onClick={() => setIsCodeModalOpen(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center border border-slate-100 transition-all text-left text-sharp text-sharp text-sharp"><LucideIcon name="x" size={20}/></button></div>
                        <form onSubmit={handleAddCode} className="p-6 md:p-10 space-y-6 md:space-y-10 text-left text-sharp text-sharp text-sharp">
                            <div className="space-y-3 md:space-y-4 text-left text-sharp text-sharp text-sharp text-sharp text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic leading-none text-left text-sharp text-sharp">Nombre de la herramienta</label><input required value={codeData.name} onChange={e => setCodeData({...codeData, name: e.target.value})} type="text" className="w-full px-5 md:px-8 py-4 md:py-6 rounded-xl md:rounded-3xl bg-slate-50 border-none outline-none font-bold text-slate-800 focus:ring-4 md:focus:ring-8 focus:ring-violet-500/10 text-sm md:text-lg shadow-inner text-left text-sharp" placeholder="Ej: Calculadora de Datos" /></div>
                            <div className="space-y-3 md:space-y-4 text-left text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp"><div className="flex justify-between items-center px-1 md:px-2 text-left text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp"><label className="text-[10px] md:text-[11px] font-bold text-violet-600 uppercase tracking-widest text-left text-sharp text-sharp text-sharp">Código fuente (HTML)</label><span className="text-[8px] md:text-[9px] text-slate-400 bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold uppercase border border-slate-100 text-sharp text-sharp text-sharp text-sharp text-left">Visor Independiente</span></div><textarea required value={codeData.html} onChange={e => setCodeData({...codeData, html: e.target.value})} className="w-full px-5 md:px-8 py-5 md:py-8 rounded-[1.5rem] md:rounded-[3rem] bg-slate-900 border-none outline-none text-emerald-400 font-mono text-[10px] md:text-xs leading-loose shadow-2xl custom-scrollbar text-left text-sharp text-sharp text-sharp text-sharp" rows="8" placeholder="Pega el código HTML completo aquí..."></textarea></div>
                            <div className="flex flex-col sm:flex-row justify-end gap-4 md:gap-6 pt-2 md:pt-4 text-left text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp text-sharp"><button type="button" onClick={() => setIsCodeModalOpen(false)} className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-all italic font-poppins text-left text-sharp py-3">Cancelar</button><button type="submit" className="bg-violet-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-full font-bold text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-violet-700 shadow-xl md:shadow-2xl active:scale-95 transition-all text-left text-sharp">Guardar herramienta</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Visor de Medios (Imágenes y Videos) */}
            {viewingMedia && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[500] flex items-center justify-center p-4 fade-in">
                    <button onClick={() => setViewingMedia(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white/50 hover:text-white transition-colors bg-black/20 p-2 rounded-full">
                        <LucideIcon name="x" size={24} className="md:w-8 md:h-8" />
                    </button>
                    <div className="max-w-5xl w-full flex items-center justify-center max-h-[90vh]">
                        {viewingMedia.type.startsWith('video/') ? (
                            <video src={viewingMedia.data} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl md:rounded-2xl shadow-2xl" />
                        ) : (
                            <img src={viewingMedia.data} className="max-w-full max-h-[85vh] rounded-xl md:rounded-2xl shadow-2xl object-contain" />
                        )}
                    </div>
                </div>
            )}
            
            {isGanttOpen && renderBigCalendar()}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
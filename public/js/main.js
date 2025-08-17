// Attendi il caricamento completo del DOM
document.addEventListener('DOMContentLoaded', function() {
    
    // Array di colori scuri e vivaci per le piazzole
    const uniqueBookingColors = [
        '#800080', // Viola scuro
        '#006400', // Verde scuro
        '#8B4513', // Marrone scuro
        '#FF6347', // Rosso pomodoro
        '#4682B4', // Blu acciaio
        '#2F4F4F', // Grigio ardesia scuro
        '#8B0000', // Rosso scuro
        '#FF8C00', // Arancione scuro
        '#556B2F', // Verde oliva scuro
        '#8B008B', // Magenta scuro
        '#483D8B', // Blu ardesia scuro
        '#A0522D', // Marrone siena
        '#CD853F', // Marrone sabbia
        '#D2691E', // Cioccolato
        '#B22222', // Rosso mattone
        '#191970', // Blu notte
        '#708090', // Grigio ardesia
        '#DC143C', // Cremisi
        '#00CED1', // Turchese scuro
        '#9932CC'  // Orchidea scuro
    ];

    // -----------------------------
    // Color utilities and fallback
    // -----------------------------
    const __shadeCache = new Map(); // key: `${pitchId}|${base}` -> hex color
    function __shadeCacheKey(pitchId, base) {
        return `${String(pitchId || 'fallback')}|${String(base || '')}`;
    }
    function __shadeCacheClear() {
        try { __shadeCache.clear(); } catch(e) { /* noop */ }
    }

    function hexToRgb(hex) {
        if (!hex) return null;
        const cleaned = hex.replace('#','');
        const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c=>c+c).join('') : cleaned, 16);
        if (Number.isNaN(bigint)) return null;
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    function rgbToHex(r, g, b) {
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(Math.max(0, Math.min(255, Math.round(r))))}${toHex(Math.max(0, Math.min(255, Math.round(g))))}${toHex(Math.max(0, Math.min(255, Math.round(b))))}`;
    }

    // Lighten/darken hex by percent (-40..+40)
    function shadeHexColor(hex, percent) {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex || '#607d8b';
        const p = Math.max(-90, Math.min(90, percent || 0)) / 100;
        const r = rgb.r + (p > 0 ? (255 - rgb.r) * p : rgb.r * p);
        const g = rgb.g + (p > 0 ? (255 - rgb.g) * p : rgb.g * p);
        const b = rgb.b + (p > 0 ? (255 - rgb.b) * p : rgb.b * p);
        return rgbToHex(r, g, b);
    }

    function getReadableTextColor(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return '#ffffff';
        // WCAG relative luminance heuristic
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        return luminance > 0.6 ? '#000000' : '#ffffff';
    }

    function hashToPercent(str) {
        // Deterministic small variation based on id; output in [-28, +12]
        let h = 0;
        for (let i = 0; i < (str || '').length; i++) {
            h = (h << 5) - h + str.charCodeAt(i);
            h |= 0;
        }
        // Map to 0..1 then to range
        const n = (Math.abs(h) % 1000) / 1000; // 0..1
        return Math.round((-28 + n * 40));
    }

    // Mapping from pitch/resource id -> category base color (from /api/data resources)
    let __resourceBaseByPitchId = new Map();
    function __setResourceBaseColors(resources) {
        try {
            __resourceBaseByPitchId = new Map();
            (resources || []).forEach(r => {
                if (!r || !r.id) return;
                if (r.categoryColor) {
                    __resourceBaseByPitchId.set(String(r.id), r.categoryColor);
                }
            });
        } catch (e) { /* noop */ }
    }

    // Mapping from category id/name -> color (from /api/categories)
    let __categoryColorById = new Map();
    let __categoryColorByName = new Map();
    async function __loadCategoriesColors() {
        try {
            const res = await fetch('/api/categories', { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return;
            const categories = await res.json();
            __categoryColorById = new Map();
            __categoryColorByName = new Map();
            (categories || []).forEach(c => {
                if (!c) return;
                if (c._id && c.color) __categoryColorById.set(String(c._id), c.color);
                if (c.name && c.color) __categoryColorByName.set(String(c.name), c.color);
            });
        } catch (e) { /* noop */ }
    }

    function resolveEventColors(eventObj) {
        const props = (eventObj && eventObj.extendedProps) || {};
        const pitchId = props.pitchId
            || props.pitch
            || props.pitch_id
            || props.pitchName
            || (typeof eventObj.getResources === 'function' ? (eventObj.getResources()?.[0]?.id) : undefined)
            || (typeof eventObj.getResourceId === 'function' ? eventObj.getResourceId() : undefined);
        // Always compute from category base to ensure live updates; ignore server-provided event colors
        let base = props.categoryColor
            || (props.categoryId ? __categoryColorById.get(String(props.categoryId)) : undefined)
            || (props.categoryName ? __categoryColorByName.get(String(props.categoryName)) : undefined)
            || __resourceBaseByPitchId.get(String(pitchId || ''))
            || props.category?.color
            || null;
        if (!base) {
            // Stable fallback based on categoryId or categoryName
            const catKey = props.categoryId || props.category?._id || props.categoryName || 'default';
            let h = 0; const s = String(catKey);
            for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
            const idx = Math.abs(h) % uniqueBookingColors.length;
            base = uniqueBookingColors[idx] || '#3f51b5';
        }
        const cacheKey = __shadeCacheKey(pitchId, base);
        let bg = __shadeCache.get(cacheKey);
        if (!bg) {
            const percent = hashToPercent(String(pitchId || 'fallback'));
            bg = shadeHexColor(base, percent);
            __shadeCache.set(cacheKey, bg);
        }
        const border = bg;
        const text = getReadableTextColor(bg);
        return { backgroundColor: bg, borderColor: border, textColor: text };
    }
    
    // Funzione helper per convertire da formato ISO a dd/mm/yyyy
    function formatISOToDDMMYYYY(isoDate) {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Funzione helper per convertire da dd/mm/yyyy a formato ISO
    function formatDDMMYYYYToISO(ddmmyyyy) {
        if (!ddmmyyyy) return '';
        const parts = ddmmyyyy.split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Funzione helper per formattare le date per l'input
    function formatDateToInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Funzione helper per formattare le date in dd/mm/yyyy
    function formatDateToDDMMYYYY(dateString) {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // Elementi del DOM
    const calendarEl = document.getElementById('calendar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const refreshBtn = document.getElementById('refreshCalendar');
    const addBookingBtn = document.getElementById('addBookingBtn');
    
    // Variabile per l'istanza del calendario
    let calendar;
    
    // Funzione per mostrare/nascondere lo spinner di caricamento
    function toggleLoading(show) {
        if (loadingSpinner) {
            if (show) {
                loadingSpinner.classList.remove('d-none');
            } else {
                loadingSpinner.classList.add('d-none');
            }
        }
    }
    
    // Funzione per caricare i dati del calendario
    async function loadCalendarData() {
        try {
            toggleLoading(true);
            
            // Chiamata fetch all'endpoint API per ottenere risorse ed eventi
            const response = await fetch('/api/data', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Verifica che i dati abbiano la struttura corretta
            if (!data.resources || !data.events) {
                throw new Error('Formato dati non valido: mancano resources o events');
            }
            
            console.log('Dati caricati:', {
                resources: data.resources.length,
                events: data.events.length
            });
            
            return data;
            
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            
            // Mostra un messaggio di errore all'utente
            showErrorMessage('Errore nel caricamento dei dati del calendario. Riprova più tardi.');
            
            // Ritorna dati vuoti per permettere al calendario di inizializzarsi
            return {
                resources: [],
                events: []
            };
        } finally {
            toggleLoading(false);
        }
    }
    
    // Funzione per mostrare messaggi di errore
    function showErrorMessage(message) {
        // Crea un toast Bootstrap per mostrare l'errore
        const toastHtml = `
            <div class="toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3" role="alert" aria-live="assertive" aria-atomic="true" style="z-index: 9999;">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        // Aggiungi il toast al body
        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        // Inizializza e mostra il toast
        const toastElement = document.body.lastElementChild;
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        // Rimuovi il toast dal DOM dopo che è nascosto
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
    
    // Funzione per inizializzare il calendario
    async function initializeCalendar() {
        try {
            // Carica colori categorie e dati
            await __loadCategoriesColors();
            const calendarData = await loadCalendarData();
            // Prepara mappa base color per pitch/resource
            __setResourceBaseColors(calendarData.resources);
            
            // Inizializza FullCalendar
            calendar = new FullCalendar.Calendar(calendarEl, {
                // Vista principale - responsiva
                initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
                
                // Viste disponibili - adattate per mobile
                headerToolbar: window.innerWidth < 768 ? {
                    left: 'prev,next',
                    center: 'title',
                    right: 'today'
                } : {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth' // rimosso pitchWeekView
                },
                
                // Nascondi orari/All-day ovunque
                displayEventTime: false,
                
                // Formato intestazioni per la vista lista (mobile)
                listDayFormat: { weekday: 'short', day: 'numeric', month: 'short' },
                listDaySideFormat: false,
                
                // Configurazione responsiva
                height: 'auto',
                contentHeight: 'auto',
                aspectRatio: window.innerWidth < 768 ? 0.8 : 1.8,
                
                // Localizzazione italiana
                locale: 'it',
                firstDay: 1, // Lunedì come primo giorno della settimana
                
                // Giorni passati selezionabili: nessuna classe di blocco
                dayCellClassNames: () => [],

                // Eventi (prenotazioni)
                events: calendarData.events,
                
                // Configurazione eventi
                eventDisplay: 'block',
                /* eventTextColor removed to allow proper contrast in list view */
                eventBorderWidth: 0,

                // Contenuto personalizzato degli eventi (più leggibile su mobile)
                eventContent: function(arg) {
                    const props = arg.event.extendedProps || {};
                    const title = props.guestName || arg.event.title || '';
                    const pitch = props.pitchName ? ` <span class="pitch-name">• ${props.pitchName}</span>` : '';
                    if (arg.view && arg.view.type && arg.view.type.startsWith('list')) {
                        return { html: `<div class="fc-list-custom"><i class="bi bi-person me-1"></i>${title}${pitch}</div>` };
                    }
                    return { html: `<div class="fc-grid-custom">${title}${pitch}</div>` };
                },
                
                // Callback per il rendering degli eventi
                eventDidMount: function(info) {
                    // Enforce colors for both grid and list views
                    try {
                        const colors = resolveEventColors(info.event);
                        if (colors.backgroundColor) {
                            info.el.style.backgroundColor = colors.backgroundColor;
                            info.el.style.borderColor = colors.borderColor || colors.backgroundColor;
                            info.el.style.color = colors.textColor || '#fff';
                            // Some sub-elements in list view need explicit color
                            const innerEls = info.el.querySelectorAll('*, .fc-list-event-graphic, .fc-list-event-title, .fc-event-title');
                            innerEls.forEach(e => { e.style.color = colors.textColor || '#fff'; });
                            // Dots/borders
                            const dot = info.el.querySelector('.fc-event-dot, .fc-list-event-dot');
                            if (dot) dot.style.borderColor = colors.borderColor || colors.backgroundColor;
                        }
                    } catch(e) {
                        // no-op if anything goes wrong
                    }
                    // Aggiungi tooltip con informazioni dettagliate
                    if (info.event.extendedProps) {
                        const props = info.event.extendedProps;
                        const tooltipContent = `
                            <strong>Ospite:</strong> ${props.guestName || info.event.title}<br>
                            <strong>Piazzola:</strong> ${props.pitchName || 'N/A'}<br>
                            <strong>Durata:</strong> ${props.duration || 'N/A'} giorni<br>
                            <strong>Creato da:</strong> ${props.createdBy || 'N/A'}
                        `;
                        
                        info.el.setAttribute('data-bs-toggle', 'tooltip');
                        info.el.setAttribute('data-bs-placement', 'top');
                        info.el.setAttribute('data-bs-html', 'true');
                        info.el.setAttribute('data-bs-title', tooltipContent);
                        
                        // Inizializza il tooltip
                        new bootstrap.Tooltip(info.el);
                    }
                },
                
                // Callback per click sugli eventi
                eventClick: function(info) {
                    const event = info.event;
                    const props = event.extendedProps;
                    // I visualizzatori possono solo gestire check-in / check-out
                    if (window.operatorData && window.operatorData.role === 'viewer') {
                        showCheckStatusModal(event, props);
                        return;
                    }

                    // Ruoli non-viewer: apri il modal completo di modifica
                    showEditBookingModal(event, props);
                },
                
                // Callback per click su data (nuova prenotazione)
                dateClick: function(info) {
                    // Controlla se l'utente è un visualizzatore - i visualizzatori non possono creare prenotazioni
                    if (window.operatorData && window.operatorData.role === 'viewer') {
                        return; // Non fare nulla se l'utente è un visualizzatore
                    }
                    // Consenti selezione anche di giorni nel passato
                    const d = new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate());
                    // Mostra lista disponibilità e poi modal creazione
                    showDayAvailabilityModal(d, () => showCreateBookingModal(info.date, null));
                }
            });
            
            // Renderizza il calendario
            calendar.render();
            
            // Gestisci il ridimensionamento della finestra
            window.addEventListener('resize', function() {
                if (!calendar) return;
                
                const isMobile = window.innerWidth < 768;
                const currentView = calendar.view ? calendar.view.type : null;

                if (isMobile) {
                    // Su mobile usiamo sempre la vista lista settimana
                    if (currentView !== 'listWeek') {
                        calendar.changeView('listWeek');
                    }
                    calendar.setOption('headerToolbar', {
                        left: 'prev,next',
                        center: 'title',
                        right: 'today'
                    });
                    calendar.setOption('aspectRatio', 0.8);
                } else {
                    // Su desktop default a month se eravamo in listWeek
                    if (currentView === 'listWeek') {
                        calendar.changeView('dayGridMonth');
                    }
                    calendar.setOption('headerToolbar', {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth'
                    });
                    calendar.setOption('aspectRatio', 1.8);
                }

                calendar.updateSize();
            });
            
            console.log('Calendario inizializzato con successo');
            
        } catch (error) {
            console.error('Errore nell\'inizializzazione del calendario:', error);
            showErrorMessage('Errore nell\'inizializzazione del calendario.');
        }
    }
    
    // Funzione per mostrare i dettagli della prenotazione
    function showBookingDetails(event, props) {
        // Determina se siamo su mobile
        const isMobile = window.innerWidth < 768;
        
        const modalHtml = `
            <div class="modal fade" id="bookingModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${isMobile ? 'modal-fullscreen-sm-down' : ''}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-event me-2"></i>
                                Dettagli Prenotazione
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="${isMobile ? 'mb-3' : 'row'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Ospite:</strong></div>
                                <div class="${isMobile ? 'mb-3' : 'col-sm-8'}">${props.guestName || event.title}</div>
                            </div>
                            <div class="${isMobile ? 'mb-3' : 'row mt-2'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Piazzola:</strong></div>
                                <div class="${isMobile ? 'mb-3' : 'col-sm-8'}">${props.pitchName || 'N/A'}</div>
                            </div>
                            <div class="${isMobile ? 'mb-3' : 'row mt-2'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Check-in:</strong></div>
                                <div class="${isMobile ? 'mb-3' : 'col-sm-8'}">${props.startDateFormatted || formatISOToDDMMYYYY(event.startStr) || (event.start ? formatISOToDDMMYYYY(formatDateYMDLocal(event.start)) : 'N/A')}</div>
                            </div>
                            <div class="${isMobile ? 'mb-3' : 'row mt-2'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Check-out:</strong></div>
                                <div class="${isMobile ? 'mb-3' : 'col-sm-8'}">${props.endDateFormatted || formatISOToDDMMYYYY(event.endStr) || (event.end ? formatISOToDDMMYYYY(formatDateYMDLocal(event.end)) : 'N/A')}</div>
                            </div>
                            <div class="${isMobile ? 'mb-3' : 'row mt-2'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Durata:</strong></div>
                                <div class="${isMobile ? 'mb-3' : 'col-sm-8'}">${props.duration || 'N/A'} giorni</div>
                            </div>
                            <div class="${isMobile ? 'mb-3' : 'row mt-2'}">
                                <div class="${isMobile ? 'fw-bold mb-1' : 'col-sm-4'}"><strong>Creato da:</strong></div>
                                <div class="${isMobile ? '' : 'col-sm-8'}">
                                    ${props.createdBy || 'N/A'}
                                    ${props.createdByRole ? `<span class="badge bg-${props.createdByRole === 'admin' ? 'danger' : 'primary'} ms-2">${props.createdByRole}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary ${isMobile ? 'btn-lg w-100' : ''}" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('bookingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Aggiungi nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
        modal.show();
        
        // Rimuovi il modal dal DOM quando viene nascosto
        document.getElementById('bookingModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    // Funzione per mostrare il modal di creazione prenotazione
        function showDayAvailabilityModal(dateObj, onCreate) {
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth()+1).padStart(2,'0');
                const d = String(dateObj.getDate()).padStart(2,'0');
                const dateStr = `${y}-${m}-${d}`;

                const existing = document.getElementById('dayAvailabilityModal');
                if (existing) existing.remove();

                const modalHtml = `
                <div class="modal fade" id="dayAvailabilityModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-list-check me-2"></i>Disponibilità ${d}/${m}/${y}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center my-3" data-loading-area>
                                    <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                                </div>
                                <div class="list-group d-none" data-result-list></div>
                                <div class="alert alert-info mt-3 d-none" data-no-data>Nessuna piazzola trovata.</div>
                                <small class="text-muted d-block mt-2">Le piazzole con "∞" non hanno prenotazioni imminenti.</small>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                                <button type="button" class="btn btn-success" data-action-create disabled><i class="bi bi-plus-lg me-2"></i>Nuova Prenotazione</button>
                            </div>
                        </div>
                    </div>
                </div>`;

                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modalEl = document.getElementById('dayAvailabilityModal');
                const modal = new bootstrap.Modal(modalEl);
                modal.show();

                const btnCreate = modalEl.querySelector('[data-action-create]');
                btnCreate.addEventListener('click', () => {
                        modal.hide();
                        if (onCreate) onCreate();
                });

                // Abilita il bottone nuova prenotazione dopo il caricamento
                fetch(`/api/daily-availability?date=${dateStr}`)
                    .then(r => r.json())
                    .then(data => {
                         const loadingArea = modalEl.querySelector('[data-loading-area]');
                         const list = modalEl.querySelector('[data-result-list]');
                         const noData = modalEl.querySelector('[data-no-data]');
                         loadingArea.classList.add('d-none');
                         if (!Array.isArray(data) || data.length === 0) {
                                noData.classList.remove('d-none');
                         } else {
                                list.classList.remove('d-none');
                                data.forEach(p => {
                                   // (Safety) se per qualche motivo arriva occupata (0) la saltiamo
                                   if (p.daysFree === 0) return;
                                   const days = p.daysFree === null ? '∞' : `${p.daysFree}g`;
                                   const badgeClass = (p.daysFree === null || p.daysFree > 7) ? 'bg-success' : 'bg-warning text-dark';
                                     const item = document.createElement('button');
                                     item.type = 'button';
                                     item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                                     item.innerHTML = `<span><strong>${p.name}</strong> <small class="text-muted">${p.category ? p.category.name : ''}</small></span><span class="badge ${badgeClass}">${days}</span>`;
                                     item.addEventListener('click', () => {
                                       modal.hide();
                                       showCreateBookingModal(dateObj, p._id);
                                     });
                                     list.appendChild(item);
                                });
                         }
                         btnCreate.disabled = false;
                    })
                    .catch(err => {
                         console.error('Errore daily availability', err);
                         const loadingArea = modalEl.querySelector('[data-loading-area]');
                         loadingArea.innerHTML = '<div class="text-danger">Errore nel caricamento disponibilità</div>';
                    });

                modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        }
    function showCreateBookingModal(selectedDate, selectedPitchId) {
    const formattedDate = formatDateToInput(selectedDate);
    const tomorrowDate = new Date(selectedDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const formattedEndDate = formatDateToInput(tomorrowDate);
        
        // Determina se siamo su mobile
        const isMobile = window.innerWidth < 768;
        
        const modalHtml = `
            <div class="modal fade" id="createBookingModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${isMobile ? 'modal-fullscreen-sm-down' : ''}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-plus me-2"></i>
                                Nuova Prenotazione
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="createBookingForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="createGuestName" class="form-label">Nome Ospite *</label>
                                    <input type="text" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="createGuestName" name="guestName" required>
                                </div>
                                <div class="${isMobile ? '' : 'row'}">
                                    <div class="${isMobile ? 'mb-3' : 'col-md-6'}">
                                        <div class="mb-3">
                                            <label for="createStartDate" class="form-label">Data Inizio *</label>
                                            <input type="date" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="createStartDate" name="start" 
                                                   value="${formattedDate}" required>
                                        </div>
                                    </div>
                                    <div class="${isMobile ? 'mb-3' : 'col-md-6'}">
                                        <div class="mb-3">
                                            <label for="createEndDate" class="form-label">Data Fine *</label>
                                            <input type="date" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="createEndDate" name="end" 
                                                   value="${formattedEndDate}" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="createCheckedIn" name="checkedIn">
                                    <label class="form-check-label" for="createCheckedIn">Check-in effettuato</label>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="createCheckedOut" name="checkedOut">
                                    <label class="form-check-label" for="createCheckedOut">Check-out effettuato</label>
                                </div>
                                <div class="mb-3">
                                    <label for="createCategorySelect" class="form-label">Categoria *</label>
                                    <select class="form-select ${isMobile ? 'form-select-lg' : ''}" id="createCategorySelect" required>
                                        <option value="">Seleziona una categoria</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="createPitchSelect" class="form-label">Piazzola *</label>
                                    <select class="form-select ${isMobile ? 'form-select-lg' : ''}" id="createPitchSelect" name="pitchId" required disabled>
                                        <option value="">Prima seleziona una categoria</option>
                                    </select>
                                </div>
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Seleziona prima una categoria, poi una piazzola disponibile per il periodo scelto
                                </div>
                            </div>
                            <div class="modal-footer ${isMobile ? 'd-grid gap-2' : ''}">
                                <button type="button" class="btn btn-secondary ${isMobile ? 'btn-lg' : ''}" data-bs-dismiss="modal">Annulla</button>
                                <button type="submit" class="btn btn-success ${isMobile ? 'btn-lg' : ''}">
                                    <i class="bi bi-check-lg me-2"></i>Crea Prenotazione
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('createBookingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Aggiungi nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Carica le categorie e imposta gli event listener
        loadCategories();
        setupCascadingSelects();
        
        // Se abbiamo una piazzola preselezionata, impostala dopo aver caricato i dati
        if (selectedPitchId) {
            console.log('Piazzola preselezionata:', selectedPitchId);
            setTimeout(async () => {
                await preselectPitchInModal(selectedPitchId);
            }, 500);
        }
        
        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('createBookingModal'));
        modal.show();
        
        // Durata live preview per il modal di creazione
        (function setupCreateDurationPreview() {
            const startInput = document.getElementById('createStartDate');
            const endInput = document.getElementById('createEndDate');
            if (!startInput || !endInput) return;
            const update = () => {
                const s = startInput.value; const e = endInput.value;
                if (!s || !e) return;
                const sd = new Date(s+"T00:00:00");
                const ed = new Date(e+"T00:00:00");
                const days = Math.ceil((ed - sd) / (1000*60*60*24));
                const container = endInput.closest('.mb-3');
                let hint = container && container.querySelector('[data-duration-preview]');
                if (!hint && container) {
                    hint = document.createElement('div');
                    hint.className = 'text-muted mt-1';
                    hint.setAttribute('data-duration-preview','');
                    container.appendChild(hint);
                }
                if (!isNaN(days)) {
                    hint.textContent = `Durata nuova: ${days} giorni`;
                } else {
                    hint.textContent = '';
                }
            };
            startInput.addEventListener('change', update);
            endInput.addEventListener('change', update);
            // iniziale
            update();
        })();

        // Gestisci il submit del form
        document.getElementById('createBookingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleCreateBooking(this, modal);
        });
        
        // Rimuovi il modal dal DOM quando viene nascosto
        document.getElementById('createBookingModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
        // Focus sul campo nome ospite
        setTimeout(() => {
            document.getElementById('createGuestName').focus();
        }, 300);
    }
    
    // Funzione per caricare le categorie
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            
            const categorySelect = document.getElementById('createCategorySelect');
            if (categorySelect && categories) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category._id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Errore nel caricamento delle categorie:', error);
        }
    }
    
    // Funzione per configurare la selezione a cascata
    function setupCascadingSelects() {
        const categorySelect = document.getElementById('createCategorySelect');
        const pitchSelect = document.getElementById('createPitchSelect');
        const startDateInput = document.getElementById('createStartDate');
        const endDateInput = document.getElementById('createEndDate');
        
        // Event listener per il cambio di categoria
        categorySelect.addEventListener('change', async function() {
            const categoryId = this.value;
            pitchSelect.innerHTML = '<option value="">Seleziona una piazzola</option>';
            pitchSelect.disabled = !categoryId;
            
            if (categoryId) {
                await loadAvailablePitchesByCategory(categoryId, startDateInput.value, endDateInput.value);
            }
        });
        
        // Event listener per il cambio delle date
        const updatePitches = async () => {
            const categoryId = categorySelect.value;
            if (categoryId) {
                pitchSelect.innerHTML = '<option value="">Seleziona una piazzola</option>';
                await loadAvailablePitchesByCategory(categoryId, startDateInput.value, endDateInput.value);
            }
        };
        
        startDateInput.addEventListener('change', updatePitches);
        endDateInput.addEventListener('change', updatePitches);
    }
    
    // Funzione per caricare le piazzole disponibili per categoria
    async function loadAvailablePitchesByCategory(categoryId, startDate, endDate) {
        try {
            const params = new URLSearchParams({
                categoryId,
                startDate: startDate || '',
                endDate: endDate || ''
            });
            
            const response = await fetch(`/api/available-pitches?${params}`);
            const pitches = await response.json();
            
            const pitchSelect = document.getElementById('createPitchSelect');
            if (pitchSelect && pitches) {
                pitches.forEach(pitch => {
                    const option = document.createElement('option');
                    option.value = pitch._id;
                    option.textContent = pitch.name;
                    option.setAttribute('data-category', pitch.category.name);
                    pitchSelect.appendChild(option);
                });
                
                if (pitches.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Nessuna piazzola disponibile per questo periodo';
                    option.disabled = true;
                    pitchSelect.appendChild(option);
                }
            }
        } catch (error) {
            console.error('Errore nel caricamento delle piazzole:', error);
        }
    }
    
    // Funzione per preselezionare una piazzola nel modal di creazione
    async function preselectPitchInModal(pitchId) {
        try {
            // Carica la piazzola specifica per ottenere la categoria
            const response = await fetch(`/api/pitches/${pitchId}`);
            const pitch = await response.json();
            
            const categorySelect = document.getElementById('createCategorySelect');
            const pitchSelect = document.getElementById('createPitchSelect');
            
            if (categorySelect && pitchSelect && pitch) {
                // Seleziona la categoria
                categorySelect.value = pitch.category._id;
                
                // Trigger change event per caricare le piazzole
                const changeEvent = new Event('change');
                categorySelect.dispatchEvent(changeEvent);
                
                // Attendi che le piazzole si carichino e seleziona quella desiderata
                setTimeout(() => {
                    pitchSelect.value = pitchId;
                }, 100);
            }
        } catch (error) {
            console.error('Errore nella preselezione della piazzola:', error);
        }
    }
    
    // Funzione per caricare le categorie nel modal di modifica
    async function loadCategoriesForEdit(props) {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            
            const categorySelect = document.getElementById('editCategorySelect');
            if (categorySelect && categories) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category._id;
                    option.textContent = category.name;
                    // Preseleziona la categoria corrente se disponibile
                    if (props.categoryId && props.categoryId === category._id) {
                        option.selected = true;
                    }
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Errore nel caricamento delle categorie per modifica:', error);
        }
    }
    
    // Funzione per configurare la selezione a cascata nel modal di modifica
    function setupCascadingSelectsForEdit(event, props) {
        const categorySelect = document.getElementById('editCategorySelect');
        const pitchSelect = document.getElementById('editPitchSelect');
        const startDateInput = document.getElementById('editStartDate');
        const endDateInput = document.getElementById('editEndDate');
        const originalCategoryId = props.categoryId || '';
        const originalPitchId = props.pitchId || '';

        // Cambio categoria: se diversa dall'originale, non forzare la piazzola corrente
        categorySelect.addEventListener('change', async function() {
            const categoryId = this.value;
            pitchSelect.innerHTML = '<option value="">Seleziona una piazzola</option>';
            pitchSelect.disabled = !categoryId;

            if (categoryId) {
                const includeCurrent = categoryId === originalCategoryId;
                const selectedToKeep = includeCurrent ? originalPitchId : '';
                await loadAvailablePitchesForEdit(categoryId, startDateInput.value, endDateInput.value, selectedToKeep, event.id, includeCurrent);
            }
        });

        // Cambio date: mantieni la selezione corrente, includi la corrente solo nella categoria originale
        const updatePitchesEdit = async () => {
            const categoryId = categorySelect.value;
            if (categoryId) {
                const currentSelected = pitchSelect.value || originalPitchId;
                const includeCurrent = categoryId === originalCategoryId;
                pitchSelect.innerHTML = '<option value="">Seleziona una piazzola</option>';
                await loadAvailablePitchesForEdit(categoryId, startDateInput.value, endDateInput.value, currentSelected, event.id, includeCurrent);
            }
        };

        startDateInput.addEventListener('change', updatePitchesEdit);
        endDateInput.addEventListener('change', updatePitchesEdit);

        // Iniziale: carica piazzole della categoria corrente e seleziona la piazzola attuale
        if (categorySelect.value) {
            loadAvailablePitchesForEdit(categorySelect.value, startDateInput.value, endDateInput.value, originalPitchId, event.id, true);
        }
    }
    
    // Funzione per caricare le piazzole disponibili nel modal di modifica
    async function loadAvailablePitchesForEdit(categoryId, startDate, endDate, selectedPitchId, currentBookingId, includeCurrentIfUnavailable) {
        try {
            const params = new URLSearchParams({
                categoryId,
                startDate: startDate || '',
                endDate: endDate || '',
                excludeBookingId: currentBookingId || '' // Escludi la prenotazione corrente dal controllo disponibilità
            });
            
            const response = await fetch(`/api/available-pitches?${params}`);
            const pitches = await response.json();
            
            const pitchSelect = document.getElementById('editPitchSelect');
            if (pitchSelect && pitches) {
                pitches.forEach(pitch => {
                    const option = document.createElement('option');
                    option.value = pitch._id;
                    option.textContent = pitch.name;
                    option.setAttribute('data-category', pitch.category.name);
                    // Preseleziona se coincide con quella richiesta
                    if (selectedPitchId && selectedPitchId === pitch._id) {
                        option.selected = true;
                    }
                    pitchSelect.appendChild(option);
                });
                
                // Se la piazzola selezionata non è nelle disponibili, aggiungila comunque solo se restiamo nella categoria originale
                if (includeCurrentIfUnavailable && selectedPitchId && !pitches.find(p => p._id === selectedPitchId)) {
                    const currentOption = document.createElement('option');
                    currentOption.value = selectedPitchId;
                    currentOption.textContent = `${pitchSelect.getAttribute('data-current-pitch-name') || 'Piazzola Corrente'} (corrente)`;
                    currentOption.selected = true;
                    pitchSelect.insertBefore(currentOption, pitchSelect.firstChild.nextSibling);
                }
                
                if (pitches.length === 0 && !selectedPitchId) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Nessuna piazzola disponibile per questo periodo';
                    option.disabled = true;
                    pitchSelect.appendChild(option);
                }
                
                pitchSelect.disabled = false;
            }
        } catch (error) {
            console.error('Errore nel caricamento delle piazzole per modifica:', error);
        }
    }
    function setupDateInputs() {
        const dateInputs = document.querySelectorAll('input[name="start"], input[name="end"]');
        
        dateInputs.forEach(input => {
            // Aggiungi l'event listener per la formattazione automatica
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Rimuovi tutti i caratteri non numerici
                
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2);
                }
                if (value.length >= 5) {
                    value = value.substring(0, 5) + '/' + value.substring(5, 9);
                }
                
                e.target.value = value;
            });
            
            // Aggiungi validazione in tempo reale
            input.addEventListener('blur', function(e) {
                const value = e.target.value;
                if (value && !isValidDate(value)) {
                    e.target.classList.add('is-invalid');
                } else {
                    e.target.classList.remove('is-invalid');
                }
            });
        });
    }
    
    // Funzione per validare il formato della data DD/MM/YYYY
    function isValidDate(dateString) {
        const regex = /^([0-2][0-9]|(3)[0-1])\/((0)[0-9]|(1)[0-2])\/\d{4}$/;
        if (!regex.test(dateString)) return false;
        
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
    
    // Funzione per mostrare il modal di modifica prenotazione
    function showEditBookingModal(event, props) {
    const startDateFormatted = props.startDateFormatted || formatISOToDDMMYYYY(event.startStr || (event.start ? formatDateYMDLocal(event.start) : ''));
    const endDateFormatted = props.endDateFormatted || formatISOToDDMMYYYY(event.endStr || (event.end ? formatDateYMDLocal(event.end) : ''));
        
        // Determina se siamo su mobile
        const isMobile = window.innerWidth < 768;
        
        const modalHtml = `
            <div class="modal fade" id="editBookingModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${isMobile ? 'modal-fullscreen-sm-down' : 'modal-lg'}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-pencil-square me-2"></i>
                                Modifica Prenotazione
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="editBookingForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="editGuestName" class="form-label">Nome Ospite *</label>
                                    <input type="text" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="editGuestName" name="guestName" value="${props.guestName || event.title}" required>
                                </div>
                                <div class="${isMobile ? '' : 'row'}">
                                    <div class="${isMobile ? 'mb-3' : 'col-md-6'}">
                                        <div class="mb-3">
                                            <label for="editStartDate" class="form-label">Data Inizio *</label>
                          <input type="date" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="editStartDate" name="start" 
                              value="${event.startStr || (event.start ? formatDateYMDLocal(event.start) : '')}" required>
                                        </div>
                                    </div>
                                    <div class="${isMobile ? 'mb-3' : 'col-md-6'}">
                                        <div class="mb-3">
                                            <label for="editEndDate" class="form-label">Data Fine *</label>
                          <input type="date" class="form-control ${isMobile ? 'form-control-lg' : ''}" id="editEndDate" name="end" 
                              value="${event.endStr || (event.end ? formatDateYMDLocal(event.end) : '')}" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="editCategorySelect" class="form-label">Categoria *</label>
                                    <select class="form-select ${isMobile ? 'form-select-lg' : ''}" id="editCategorySelect" required>
                                        <option value="">Seleziona una categoria</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="editPitchSelect" class="form-label">Piazzola *</label>
                                    <select class="form-select ${isMobile ? 'form-select-lg' : ''}" id="editPitchSelect" name="pitchId" required disabled data-current-pitch-name="${props.pitchName || ''}">
                                        <option value="" disabled selected>Seleziona una piazzola</option>
                                    </select>
                                </div>
                                <div class="mb-2 form-check">
                                    <input type="checkbox" class="form-check-input" id="editCheckedIn" name="checkedIn" ${props.checkedIn ? 'checked' : ''}>
                                    <label class="form-check-label" for="editCheckedIn">Check-in effettuato</label>
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="editCheckedOut" name="checkedOut" ${props.checkedOut ? 'checked' : ''}>
                                    <label class="form-check-label" for="editCheckedOut">Check-out effettuato</label>
                                </div>
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    <strong>Attenzione:</strong> La modifica delle date o della piazzola potrebbe causare conflitti con altre prenotazioni.
                                </div>
                                <div class="${isMobile ? '' : 'row'} mt-3">
                                    <div class="${isMobile ? 'mb-2' : 'col-md-6'}">
                                        <small class="text-muted">
                                            <strong>Durata attuale:</strong> ${props.duration || 'N/A'} giorni
                                        </small>
                                    </div>
                                    <div class="${isMobile ? 'mb-2' : 'col-md-6'}">
                                        <small class="text-muted">
                                            <strong>Creato da:</strong> ${props.createdBy || 'N/A'}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer ${isMobile ? 'd-grid gap-2' : ''}">
                                <button type="button" class="btn btn-secondary ${isMobile ? 'btn-lg' : ''}" data-bs-dismiss="modal">Annulla</button>
                                <button type="button" class="btn btn-danger ${isMobile ? 'btn-lg' : 'me-auto'}" onclick="confirmDeleteBooking('${event.id}')">
                                    <i class="bi bi-trash me-2"></i>Elimina
                                </button>
                                <button type="submit" class="btn btn-primary ${isMobile ? 'btn-lg' : ''}">
                                    <i class="bi bi-check-lg me-2"></i>Salva Modifiche
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('editBookingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Aggiungi nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Carica le categorie e configura gli event listener per la modifica
        (async () => {
            await loadCategoriesForEdit(props);
            setupCascadingSelectsForEdit(event, props);
            // Abilita subito la select piazzola e popola secondo categoria corrente
            const editPitchSelectEl = document.getElementById('editPitchSelect');
            editPitchSelectEl.disabled = false;
            const editCategorySelectEl = document.getElementById('editCategorySelect');
            if (editCategorySelectEl && editCategorySelectEl.value) {
                await loadAvailablePitchesForEdit(
                    editCategorySelectEl.value,
                    document.getElementById('editStartDate').value,
                    document.getElementById('editEndDate').value,
                    props.pitchId || '',
                    event.id,
                    true
                );
            }
        })();
        
        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('editBookingModal'));
        modal.show();
        
        // Durata live preview per il modal di modifica
        (function setupEditDurationPreview() {
            const startInput = document.getElementById('editStartDate');
            const endInput = document.getElementById('editEndDate');
            if (!startInput || !endInput) return;
            const update = () => {
                const s = startInput.value; const e = endInput.value;
                if (!s || !e) return;
                const sd = new Date(s+"T00:00:00");
                const ed = new Date(e+"T00:00:00");
                const days = Math.ceil((ed - sd) / (1000*60*60*24));
                const container = endInput.closest('.mb-3');
                let hint = container && container.querySelector('[data-duration-preview]');
                if (!hint && container) {
                    hint = document.createElement('div');
                    hint.className = 'text-muted mt-1';
                    hint.setAttribute('data-duration-preview','');
                    container.appendChild(hint);
                }
                if (!isNaN(days)) {
                    hint.textContent = `Durata nuova: ${days} giorni`;
                } else if (hint) {
                    hint.textContent = '';
                }
            };
            startInput.addEventListener('change', update);
            endInput.addEventListener('change', update);
            // iniziale
            update();
        })();

        // Gestisci il submit del form
        document.getElementById('editBookingForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleUpdateBooking(this, event.id, modal);
        });
        
        // Rimuovi il modal dal DOM quando viene nascosto
        document.getElementById('editBookingModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // Modal leggero per consentire a tutti (inclusi i visualizzatori) di togglare check-in / check-out
    function showCheckStatusModal(event, props) {
        const isMobile = window.innerWidth < 768;
        const modalHtml = `
            <div class="modal fade" id="checkStatusModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${isMobile ? 'modal-fullscreen-sm-down' : ''}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-people-check me-2"></i>
                                Check-in / Check-out
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="checkStatusForm">
                            <div class="modal-body">
                                <div class="mb-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="viewerCheckedIn" ${props.checkedIn ? 'checked' : ''}>
                                        <label class="form-check-label" for="viewerCheckedIn">Check-in effettuato</label>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="viewerCheckedOut" ${props.checkedOut ? 'checked' : ''}>
                                        <label class="form-check-label" for="viewerCheckedOut">Check-out effettuato</label>
                                    </div>
                                </div>
                                <small class="text-muted d-block">Puoi modificare solo lo stato di check-in/check-out.</small>
                            </div>
                            <div class="modal-footer ${isMobile ? 'd-grid gap-2' : ''}">
                                <button type="button" class="btn btn-secondary ${isMobile ? 'btn-lg' : ''}" data-bs-dismiss="modal">Chiudi</button>
                                <button type="submit" class="btn btn-primary ${isMobile ? 'btn-lg' : ''}">
                                    <i class="bi bi-check-lg me-2"></i>Salva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        // Rimuovi modal esistente se presente
        const existing = document.getElementById('checkStatusModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('checkStatusModal'));
        modal.show();

        document.getElementById('checkStatusForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const checkedIn = document.getElementById('viewerCheckedIn').checked;
            const checkedOut = document.getElementById('viewerCheckedOut').checked;
            try {
                const res = await fetch(`/api/bookings/${event.id}/check-status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ checkedIn, checkedOut })
                });
                if (!res.ok) throw new Error('Aggiornamento stato fallito');
                showSuccessMessage('Stato aggiornato');
                modal.hide();
                await refreshCalendar();
                await updateDashboardStats();
            } catch (err) {
                console.error(err);
                showErrorMessage('Impossibile aggiornare lo stato.');
            }
        });

        document.getElementById('checkStatusModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    // Funzione per gestire la creazione di una nuova prenotazione
    async function handleCreateBooking(form, modal) {
        // Salva il testo originale del pulsante submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        try {
            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());
            bookingData.checkedIn = form.querySelector('[name="checkedIn"]').checked;
            bookingData.checkedOut = form.querySelector('[name="checkedOut"]').checked;
            
            // Mostra loading sul pulsante submit
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando...';
            submitBtn.disabled = true;
            
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Successo
                showSuccessMessage('Prenotazione creata con successo!');
                modal.hide();
                
                // Ricarica il calendario e aggiorna le statistiche
                await refreshCalendar();
                await updateDashboardStats();
                
            } else {
                // Errore dal server
                throw new Error(result.message || 'Errore nella creazione della prenotazione');
            }
            
        } catch (error) {
            console.error('Errore nella creazione della prenotazione:', error);
            showErrorMessage(error.message || 'Errore nella creazione della prenotazione');
            
        } finally {
            // Ripristina il pulsante submit
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
    
    // Funzione per gestire l'aggiornamento di una prenotazione
    async function handleUpdateBooking(form, bookingId, modal) {
        // Salva il testo originale del pulsante submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());
            if (form.querySelector('[name="checkedIn"]')) {
                bookingData.checkedIn = form.querySelector('[name="checkedIn"]').checked;
            }
            if (form.querySelector('[name="checkedOut"]')) {
                bookingData.checkedOut = form.querySelector('[name="checkedOut"]').checked;
            }
            
            // Mostra loading sul pulsante submit
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
            submitBtn.disabled = true;
            
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Successo
                showSuccessMessage('Prenotazione aggiornata con successo!');
                modal.hide();
                
                // Ricarica il calendario e aggiorna le statistiche
                await refreshCalendar();
                await updateDashboardStats();
                
            } else {
                // Errore dal server
                throw new Error(result.message || 'Errore nell\'aggiornamento della prenotazione');
            }
            
        } catch (error) {
            console.error('Errore nell\'aggiornamento della prenotazione:', error);
            showErrorMessage(error.message || 'Errore nell\'aggiornamento della prenotazione');
            
        } finally {
            // Ripristina il pulsante submit
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
    
    // Funzione per confermare l'eliminazione di una prenotazione
    function confirmDeleteBooking(bookingId) {
        if (confirm('Sei sicuro di voler eliminare questa prenotazione? Questa azione non può essere annullata.')) {
            deleteBooking(bookingId);
        }
    }
    
    // Funzione per eliminare una prenotazione
    async function deleteBooking(bookingId) {
        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showSuccessMessage('Prenotazione eliminata con successo!');
                
                // Chiudi il modal se aperto
                const modal = document.getElementById('editBookingModal');
                if (modal) {
                    const instance = bootstrap.Modal.getInstance(modal);
                    if (instance) instance.hide();
                }
                
                // Ricarica il calendario e aggiorna le statistiche
                await refreshCalendar();
                await updateDashboardStats();
                
            } else {
                throw new Error(result.message || 'Errore nell\'eliminazione della prenotazione');
            }
            
        } catch (error) {
            console.error('Errore nell\'eliminazione della prenotazione:', error);
            showErrorMessage(error.message || 'Errore nell\'eliminazione della prenotazione');
        }
    }
    
    // Rendi disponibili globalmente le funzioni di eliminazione per gli handler inline del modal
    window.confirmDeleteBooking = confirmDeleteBooking;
    window.deleteBooking = deleteBooking;

    // Funzione per mostrare messaggi di successo
    function showSuccessMessage(message) {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3" role="alert" aria-live="assertive" aria-atomic="true" style="z-index: 9999;">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.body.lastElementChild;
        const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
    
    // Funzione per aggiornare le statistiche della dashboard
    async function updateDashboardStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            // Aggiorna i badge delle statistiche
            const totalPitchesEl = document.querySelector('[data-stat="total-pitches"]');
            const totalBookingsEl = document.querySelector('[data-stat="total-bookings"]');
            const activeBookingsEl = document.querySelector('[data-stat="active-bookings"]');
            
            if (totalPitchesEl) totalPitchesEl.textContent = stats.totalPitches || '0';
            if (totalBookingsEl) totalBookingsEl.textContent = stats.totalBookings || '0';
            if (activeBookingsEl) activeBookingsEl.textContent = stats.activeBookings || '0';
            
        } catch (error) {
            console.error('Errore nell\'aggiornamento delle statistiche:', error);
        }
    }
    
    // Funzione per ricaricare i dati del calendario
    async function refreshCalendar() {
        if (!calendar) return;
        
        try {
            // Clear color cache so category color changes are reflected
            __shadeCacheClear();
            const calendarData = await loadCalendarData();
            
            // Prepara mappa base color per pitch/resource (ricarica anche palette categorie)
            await __loadCategoriesColors();
            __setResourceBaseColors(calendarData.resources);
            // Rimuovi tutti gli eventi esistenti
            calendar.removeAllEvents();
            
            // Aggiungi i nuovi eventi
            calendar.addEventSource(calendarData.events);
            
            console.log('Calendario aggiornato');
            
        } catch (error) {
            console.error('Errore nell\'aggiornamento del calendario:', error);
            showErrorMessage('Errore nell\'aggiornamento del calendario.');
        }
    }
    
    // Event listener per il pulsante refresh
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCalendar);
    }
    
    // Event listener per il bottone aggiungi prenotazione (sia desktop che mobile)
    if (addBookingBtn) {
        addBookingBtn.addEventListener('click', function() {
            // Controlla se l'utente è un visualizzatore - i visualizzatori non possono creare prenotazioni
            if (window.operatorData && window.operatorData.role === 'viewer') {
                return; // Non fare nulla se l'utente è un visualizzatore
            }
            
            // Apri il modal per creare una nuova prenotazione con la data di oggi
            const today = new Date();
            showCreateBookingModal(today);
        });
    }
    
    // Event listener per il pulsante desktop aggiuntivo
    const addBookingBtnDesktop = document.getElementById('addBookingBtnDesktop');
    if (addBookingBtnDesktop) {
        addBookingBtnDesktop.addEventListener('click', function() {
            // Controlla se l'utente è un visualizzatore - i visualizzatori non possono creare prenotazioni
            if (window.operatorData && window.operatorData.role === 'viewer') {
                return; // Non fare nulla se l'utente è un visualizzatore
            }
            
            const today = new Date();
            showCreateBookingModal(today);
        });
    }
    
    // Event listener aggiuntivo per il FAB mobile (se presente)
    const fabAddBooking = document.getElementById('fabAddBooking');
    if (fabAddBooking) {
        fabAddBooking.addEventListener('click', function() {
            const today = new Date();
            showCreateBookingModal(today);
        });
    }
    
    // Inizializza il calendario
    initializeCalendar();
    
    // Esporta funzioni per uso globale se necessario
    window.EcoGardenCalendar = {
        refresh: refreshCalendar,
        getCalendar: () => calendar
    };

    // Click handler: Arrivi di oggi -> marca come arrivato (check-in true)
    document.addEventListener('click', async function(e) {
        const el = e.target.closest('[data-booking-arrival]');
        if (!el) return;
        // I visualizzatori possono marcare l'arrivo
        const already = el.getAttribute('data-checked-in') === 'true';
        if (already) return; // già arrivato
        const bookingId = el.getAttribute('data-booking-id');
        if (!bookingId) return;
        try {
            // Ottimistica: aggiorna UI
            el.classList.remove('bg-light');
            el.classList.add('bg-success-subtle','border','border-success');
            const badge = el.querySelector('.badge');
            if (badge) {
                badge.className = 'badge bg-success';
                badge.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Arrivato';
            }
            el.setAttribute('data-checked-in','true');
            // API update
            const res = await fetch(`/api/bookings/${bookingId}/check-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ checkedIn: true })
            });
            if (!res.ok) {
                throw new Error('Aggiornamento check-in fallito');
            }
            // Aggiorna statistiche
            await updateDashboardStats();
        } catch (err) {
            console.error(err);
            showErrorMessage('Impossibile segnare come arrivato.');
        }
    });
});

// Utilità globali fuori dal DOMContentLoaded
function formatDateYMDLocal(date) {
    if (!date) return '';
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

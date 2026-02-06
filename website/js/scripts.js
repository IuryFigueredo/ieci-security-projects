/* 
 * ARQUIVO: scripts.js
 * DESCRICAO: Lógica principal da aplicação (Simuladores, Gráficos, Quiz e Gestão de Tema).
 * DEPENDENCIAS: jQuery 1.11.3, Highcharts, Leaflet.
 */

/* --- 1. ESTADO GLOBAL --- */
var appState = {
    tcp: { step: 0, clientISN: 0, serverISN: 0, isAnimating: false },
    scan: { timer: null },
    quiz: { index: 0 }
};

/* --- 2. DADOS ESTÁTICOS --- */
var perguntasQuiz = [
    { q: "Qual o tamanho do campo Sequence Number no cabeçalho TCP?", o: ["16 bits", "64 bits", "32 bits", "128 bits"], r: "32 bits" },
    { q: "O que acontece se uma porta estiver FECHADA ao receber um SYN?", o: ["Envia RST", "Descarta (Drop)", "Envia SYN-ACK", "Envia FIN"], r: "Envia RST" },
    { q: "Qual destes scans é conhecido como 'Half-open'?", o: ["TCP Connect", "UDP Scan", "XMAS Scan", "SYN Scan"], r: "SYN Scan" },
    { q: "No protocolo ICMP (RFC 792), qual é o Tipo/Código para 'Port Unreachable'?", o: ["Tipo 3, Código 0", "Tipo 3, Código 3", "Tipo 8, Código 0", "Tipo 0, Código 0"], r: "Tipo 3, Código 3" },
    { q: "O ACK Scan é utilizado principalmente para...", o: ["Ver se a porta está aberta", "Derrubar a conexão", "Mapear regras de Firewall (Stateful vs Stateless)", "Fazer spoofing de IP"], r: "Mapear regras de Firewall (Stateful vs Stateless)" },
    { q: "Qual a vulnerabilidade associada à CVE-2023-45237?", o: ["ISN Previsível em firmwares UEFI", "Buffer Overflow no Kernel", "Injeção SQL", "Falha no Handshake SSL"], r: "ISN Previsível em firmwares UEFI" },
    { q: "Porque é que o Scanning UDP é geralmente mais lento?", o: ["O protocolo é pesado", "Exige 3-way handshake", "O UDP é encriptado", "Rate Limiting de mensagens ICMP pelo SO alvo"], r: "Rate Limiting de mensagens ICMP pelo SO alvo" },
    { q: "Se enviares um pacote NULL (sem flags) para uma porta ABERTA, o que acontece?", o: ["Responde com RST", "O pacote é descartado (Drop/Sem resposta)", "Responde com ACK", "Responde com SYN"], r: "O pacote é descartado (Drop/Sem resposta)" },
    { q: "Quantas unidades de sequência (SEQ) consome a flag SYN?", o: ["1 unidade lógica", "0 bytes", "20 bytes", "Depende do tamanho do pacote"], r: "1 unidade lógica" },
    { q: "Qual o tamanho mínimo do cabeçalho TCP (sem opções)?", o: ["8 Bytes", "40 Bytes", "60 Bytes", "20 Bytes"], r: "20 Bytes" }
];

/* --- 3. INICIALIZAÇÃO --- */
$(document).ready(function() {
    initClock();
    initTheme();
    
    // Inicialização condicional baseada na existência dos elementos na página
    if ($('#btn-syn').length) initTCPSimulator();
    if ($('#btn-iniciar-scan').length) initScanSimulator();
    if ($('#map').length) initMap();
    if ($('#quiz-container').length) initQuiz();
    if ($('#btn-calc-overhead').length) initOverheadCalc();
    
    // Gráficos Highcharts
    if ($('#protocol-comparison-chart').length) initTechnicalChart();
    if ($('#grafico-principal').length) initCharts();

    // Verificação de Tema no Arranque para gráficos
    var savedTheme = localStorage.getItem('ieci-theme') || 'light';
    if (savedTheme === 'dark') {
        setTimeout(function() { updateChartTheme('dark'); }, 100);
    }
});

/* --- 4. FUNÇÕES GERAIS --- */

/**
 * Atualiza o relógio digital no rodapé a cada segundo.
 */
function initClock() {
    if ($('#relogio-digital').length) {
        setInterval(function() {
            var now = new Date();
            $('#relogio-digital').text(now.toLocaleTimeString('pt-PT'));
        }, 1000);
    }
}

/**
 * Gere a alternância entre modo claro e escuro e persiste a escolha.
 */
function initTheme() {
    var themeBtn = $('#themeBtn');
    var icon = themeBtn.find('i');
    var saved = localStorage.getItem('ieci-theme') || 'light';

    if (saved === 'dark') {
        $('body').addClass('dark-theme');
        icon.removeClass('fa-moon-o').addClass('fa-sun-o');
    }

    themeBtn.click(function(e) {
        e.preventDefault();
        $('body').toggleClass('dark-theme');
        
        var currentTheme = $('body').hasClass('dark-theme') ? 'dark' : 'light';
        
        if (currentTheme === 'dark') {
            icon.removeClass('fa-moon-o').addClass('fa-sun-o');
        } else {
            icon.removeClass('fa-sun-o').addClass('fa-moon-o');
        }

        localStorage.setItem('ieci-theme', currentTheme);
        updateChartTheme(currentTheme);

        // Força redraw para corrigir cores de eixos instantaneamente
        if (typeof Highcharts !== 'undefined' && Highcharts.charts) {
            Highcharts.charts.forEach(function(chart){
                if(chart) chart.redraw();
            });
        }
    });
}

/**
 * Atualiza o estilo dos gráficos Highcharts conforme o tema.
 * @param {string} theme - 'dark' ou 'light'
 */
function updateChartTheme(theme) {
    var isDark = (theme === 'dark');
    var textColor = isDark ? '#ffffff' : '#333333';
    var gridColor = isDark ? '#505053' : '#e6e6e6';
    var bgColor   = null; // Transparente

    if (typeof Highcharts !== 'undefined' && Highcharts.charts) {
        Highcharts.charts.forEach(function(chart) {
            if (chart) {
                chart.update({
                    chart: { backgroundColor: bgColor },
                    title: { style: { color: textColor } },
                    subtitle: { style: { color: textColor } },
                    xAxis: {
                        labels: { style: { color: textColor } },
                        lineColor: gridColor,
                        tickColor: gridColor,
                        title: { style: { color: textColor } }
                    },
                    yAxis: {
                        labels: { style: { color: textColor } },
                        title: { style: { color: textColor } },
                        gridLineColor: gridColor
                    },
                    legend: {
                        itemStyle: { color: textColor },
                        itemHoverStyle: { color: isDark ? '#FFF' : '#000' }
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                        style: { color: isDark ? '#ffffff' : '#333333' }
                    }
                });
            }
        });
    }
}

/* --- 5. VISUALIZAÇÃO DE DADOS (HIGHCHARTS) --- */

/**
 * Renderiza o gráfico de rosca/pie na página Técnica.
 */
function initTechnicalChart() {
    var renderTechChart = function(type) {
        var hcType = type === 'doughnut' ? 'pie' : type;
        var innerSize = type === 'doughnut' ? '50%' : '0%';

        $('#protocol-comparison-chart').highcharts({
            chart: { type: hcType, backgroundColor: 'transparent' },
            title: { text: 'Tamanho dos Cabeçalhos (Bytes)' },
            tooltip: { pointFormat: '{series.name}: <b>{point.y} Bytes</b>' },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    innerSize: innerSize,
                    dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}B' }
                }
            },
            series: [{
                name: 'Tamanho',
                colorByPoint: true,
                data: [
                    { name: 'TCP Header', y: 20, color: '#0d6efd' },
                    { name: 'UDP Header', y: 8, color: '#198754' },
                    { name: 'ICMP Header', y: 8, color: '#ffc107' }
                ]
            }],
            credits: { enabled: false }
        });
    };

    renderTechChart('doughnut');

    $('#tech-chart-selector').change(function() {
        renderTechChart($(this).val());
        var currentTheme = localStorage.getItem('ieci-theme') || 'light';
        if(currentTheme === 'dark') updateChartTheme('dark');
    });
}

/**
 * Renderiza o gráfico de barras comparativo na página Análise.
 */
function initCharts() {
    var renderChart = function(type) {
        Highcharts.chart('grafico-principal', {
            chart: { type: type, backgroundColor: 'transparent', style: { fontFamily: 'Segoe UI' } },
            title: { text: 'Comparativo de Técnicas de Scan' },
            subtitle: { text: 'Velocidade vs Furtividade' },
            xAxis: { categories: ['TCP SYN', 'UDP Scan', 'NULL/Stealth', 'ACK Scan'], crosshair: true },
            yAxis: { min: 0, max: 100, title: { text: 'Pontuação (0-100)' } },
            tooltip: { shared: true },
            series: [{
                name: 'Velocidade', data: [95, 30, 70, 90], color: '#337ab7'
            }, {
                name: 'Furtividade', data: [20, 60, 95, 50], color: '#d9534f'
            }],
            credits: { enabled: false }
        });
    };

    renderChart('column');

    $('#chart-type-selector').change(function() {
        renderChart($(this).val());
        var currentTheme = localStorage.getItem('ieci-theme') || 'light';
        if(currentTheme === 'dark') updateChartTheme('dark');
    });
}

/* --- 6. GEOLOCALIZAÇÃO --- */

/**
 * Inicializa o mapa com marcadores para o DETI e Reitoria.
 */
function initMap() {
    var map = L.map('map').setView([40.6315, -8.6575], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '&copy; OSM contributors' 
    }).addTo(map);

    var detimarker = L.marker([40.6332, -8.6595]).addTo(map).bindPopup("<b>DETI</b><br>Dept. Eletrónica");
    L.marker([40.6310, -8.6575]).addTo(map).bindPopup("<b>Reitoria UA</b><br>Campus Santiago");

    // Polígono a delimitar a área do DETI
    var polygon = [
        [40.6335, -8.6598], [40.6335, -8.6590],
        [40.6328, -8.6590], [40.6328, -8.6598]
    ];
    L.polygon(polygon, { color: 'red', fillColor: '#f03', fillOpacity: 0.2 }).addTo(map);

    // Zoom ao clicar nos autores
    $('.author-row').click(function() {
        map.flyTo([40.6332, -8.6595], 18);
        detimarker.openPopup(); 
    });
}

/* --- 7. LABORATÓRIO: SIMULADOR TCP --- */

function initTCPSimulator() {
    $('#btn-syn').click(function() { stepTCP('SYN'); });
    $('#btn-synack').click(function() { stepTCP('SYN-ACK'); });
    $('#btn-ack').click(function() { stepTCP('ACK'); });
    $('#btn-reset-sim').click(function() { resetTCP(); });
    resetTCP();
}

/**
 * Controla os passos do handshake TCP com animação.
 * @param {string} type - Tipo do pacote (SYN, SYN-ACK, ACK)
 */
function stepTCP(type) {
    if (appState.tcp.isAnimating) return;
    
    var pkt = $('#tcp-packet');
    var status = $('#status-handshake');
    
    pkt.show().removeClass().addClass('label shadow'); 
    
    var start = 10, end = 85, next = 0, msg = "", colorClass = "";

    if (type === 'SYN') {
        colorClass = 'label-primary'; 
        pkt.text('SYN (Seq=' + appState.tcp.clientISN + ')'); 
        next = 1; 
        msg = "SYN enviado. O cliente define o ISN.";
    } else if (type === 'SYN-ACK') {
        colorClass = 'label-warning'; 
        pkt.html('SYN+ACK<br>Ack=' + (appState.tcp.clientISN + 1)); 
        start = 85; end = 10; next = 2; 
        msg = "SYN-ACK recebido. Servidor confirma Seq+1.";
    } else {
        colorClass = 'label-success'; 
        pkt.html('ACK<br>Ack=' + (appState.tcp.serverISN + 1)); 
        next = 3; 
        msg = "Conexão ESTABLISHED. Handshake completo.";
    }
    
    pkt.addClass(colorClass);
    
    animateElement(pkt, start, end, function() {
        appState.tcp.step = next;
        status.show().html(msg).removeClass().addClass('alert mt-20 ' + (type === 'SYN-ACK' ? 'alert-warning' : (type === 'SYN' ? 'alert-info' : 'alert-success')));
        toggleTCP(next);
    });
}

function toggleTCP(step) {
    $('#btn-syn').prop('disabled', step !== 0);
    $('#btn-synack').prop('disabled', step !== 1);
    $('#btn-ack').prop('disabled', step !== 2);
}

function resetTCP() {
    appState.tcp.step = 0;
    appState.tcp.clientISN = Math.floor(Math.random() * 1000) + 1000;
    appState.tcp.serverISN = 5000;
    $('#tcp-packet').hide().css('left', '10%');
    $('#status-handshake').hide();
    toggleTCP(0);
}

/* --- 8. LABORATÓRIO: SIMULADOR DE SCAN --- */

/**
 * Gere a validação e animação da simulação de Nmap.
 */
function initScanSimulator() {
    $('#btn-iniciar-scan').click(function() {
        var ipInput = $('#targetIP');
        var ipVal = ipInput.val().trim();
        var status = $('#scan-status-text');
        var bar = $('#scan-progress-bar');
        var cmd = $('#comando-output');
        var scanType = $('#scanType').val();

        // Validação: Octetos entre 0-255
        var ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (ipVal !== "" && !ipRegex.test(ipVal)) {
            ipInput.parent().addClass('has-error');
            status.text("Erro: Endereço IP inválido (Ex: 192.168.1.1).").addClass('text-danger');
            return;
        } else {
            ipInput.parent().removeClass('has-error');
            status.removeClass('text-danger');
        }

        var finalIP = ipVal || "192.168.1.1";
        cmd.text('nmap ' + scanType + ' -T3 ' + finalIP);
        var width = 0;
        bar.css('width', '0%').addClass('active');
        
        if (appState.scan.timer) clearInterval(appState.scan.timer);

        status.text("A iniciar " + scanType + "... A enviar sondas...");

        appState.scan.timer = setInterval(function() {
            if (width >= 100) {
                clearInterval(appState.scan.timer);
                bar.removeClass('active');
                status.text("Scan Concluído. Portas filtradas detetadas.");
            } else {
                width++;
                bar.css('width', width + '%');
                if (width === 30) status.text("A aguardar respostas (RST/ACK)...");
                if (width === 70) status.text("A analisar tempos de resposta...");
            }
        }, 40);
    });
}

/* --- 9. LABORATÓRIO: QUIZ --- */

function initQuiz() {
    $('#opcoes-quiz').on('click', 'button', function() {
        var txt = $(this).text();
        if (txt === 'Começar Quiz' || txt === 'Reiniciar Quiz') {
            appState.quiz.index = 0;
            renderQ();
        } else {
            checkA(txt);
        }
    });
}

function renderQ() {
    var q = perguntasQuiz[appState.quiz.index];
    $('#quiz-feedback').hide();
    $('#pergunta-num').text('Questão ' + (appState.quiz.index + 1));
    $('#pergunta-texto').text(q.q);
    
    var buttonsHtml = q.o.map(function(opt) {
        return '<button class="btn btn-default btn-block mb-20 text-left" style="text-align:left; margin-bottom:5px;">' + opt + '</button>';
    }).join('');
    
    $('#opcoes-quiz').html(buttonsHtml);
}

function checkA(ans) {
    var fb = $('#quiz-feedback');
    fb.show();
    
    if (ans === perguntasQuiz[appState.quiz.index].r) {
        fb.removeClass('alert-danger').addClass('alert-success').text("Correto!");
        appState.quiz.index++;
        setTimeout(function() {
            appState.quiz.index < perguntasQuiz.length ? renderQ() : finishQ();
        }, 1000);
    } else { 
        fb.removeClass('alert-success').addClass('alert-danger').text("Incorreto."); 
    }
}

function finishQ() {
    $('#pergunta-texto').text("Parabéns! Quiz concluído.");
    $('#opcoes-quiz').html('<button class="btn btn-primary btn-block">Reiniciar Quiz</button>');
}

/* --- 10. LABORATÓRIO: CALCULADORA --- */

function initOverheadCalc() {
    $('#btn-calc-overhead').click(function() {
        var inputEl = $('#dataInput');
        var inputVal = inputEl.val();
        
        // Tratamento de NaN e números negativos
        var val = parseInt(inputVal) || 0; 
        if (val < 0) val = 0;

        if (val === 0 && inputVal !== "0") {
            inputEl.parent().addClass('has-warning');
        } else {
            inputEl.parent().removeClass('has-warning');
        }
        
        $('#totalRes').text(val + 40); 
    });
}

/* --- 11. UTILITÁRIOS --- */

/**
 * Animação manual via setInterval (Requisito de Guião).
 * @param {Object} el - Elemento jQuery
 * @param {number} start - Posição inicial (%)
 * @param {number} end - Posição final (%)
 * @param {function} callback - Função a executar no fim
 */
function animateElement(el, start, end, callback) {
    appState.tcp.isAnimating = true;
    var pos = start;
    var increment = start < end ? 1 : -1;
    
    var t = setInterval(function() {
        if (pos === end) {
            clearInterval(t);
            appState.tcp.isAnimating = false;
            if (callback) callback();
        } else {
            pos += increment;
            el.css('left', pos + '%');
        }
    }, 10);
}

// Helpers para onclick inline (Tecnica.html)
window.detalhe = function(t) { alert("RFC 793: " + t); };
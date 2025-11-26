// ====================================
// GERENCIAMENTO DE SEÇÕES
// ====================================

function goToSection(sectionId) {
  // Remove a classe 'active' de todas as seções
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => section.classList.remove("active"));

  // Adiciona a classe 'active' à seção desejada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
    window.scrollTo(0, 0);
  }
}

// ====================================
// CANVAS ANIMATIONS - AMOSTRAGEM
// ====================================

function animateSampling() {
  const canvas = document.getElementById("samplingCanvas");
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;
  const centerY = height / 2;

  let animationProgress = 0;
  const animationDuration = 3000; // ms
  let animationId = null;

  function animate(timestamp) {
    if (!animate.startTime) animate.startTime = timestamp;
    animationProgress = ((timestamp - animate.startTime) % animationDuration) / animationDuration;

    // Limpar canvas
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    // Desenhar eixos
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Desenhar sinal analógico (senoidal contínuo)
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const frequency = 0.01;
      const y = centerY - Math.sin(x * frequency + animationProgress * Math.PI * 2) * 60;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Desenhar pontos de amostragem
    const samplePoints = 16;
    const sampleInterval = width / samplePoints;

    ctx.fillStyle = "#3498db";
    for (let i = 0; i < samplePoints; i++) {
      const x = i * sampleInterval;
      const frequency = 0.01;
      const y = centerY - Math.sin(x * frequency + animationProgress * Math.PI * 2) * 60;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Linhas de grade
      ctx.strokeStyle = "#3498db";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Desenhar sinal digital (degraus)
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < samplePoints - 1; i++) {
      const x1 = i * sampleInterval;
      const x2 = (i + 1) * sampleInterval;
      const frequency = 0.01;
      const y = centerY - Math.sin(x1 * frequency + animationProgress * Math.PI * 2) * 60;

      if (i === 0) ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#2c3e50";
    ctx.font = "12px Arial";
    ctx.fillText("Sinal Analógico (Vermelho)", 10, 20);
    ctx.fillText("Sinal Digital (Verde)", 10, 40);
    ctx.fillText("Pontos de Amostragem (Azul)", 10, 60);

    animationId = requestAnimationFrame(animate);
  }

  animate.startTime = null;
  animate(performance.now());
}

// ====================================
// ONDAS SONORAS - SVG
// ====================================

function drawWave(type) {
  const svg = document.getElementById("waveVisualization");
  const wavePath = document.getElementById("wavePath");

  let pathData = "M 0 100";
  const points = 800;
  const amplitude = 80;

  for (let i = 0; i < points; i++) {
    const x = i;
    let y = 100;

    switch (type) {
      case "sine":
        y = 100 - amplitude * Math.sin((i / 100) * Math.PI * 2);
        break;
      case "square":
        const squarePhase = (i / 100) % 2;
        y = squarePhase < 1 ? 100 - amplitude : 100 + amplitude;
        break;
      case "triangle":
        const trianglePhase = (i / 100) % 2;
        y =
          trianglePhase < 1
            ? 100 - amplitude + trianglePhase * amplitude * 2
            : 100 + amplitude - (trianglePhase - 1) * amplitude * 2;
        break;
    }

    pathData += ` L ${x} ${y}`;
  }

  wavePath.setAttribute("d", pathData);
}

// Desenhar onda padrão ao carregar
window.addEventListener("load", () => {
  drawWave("sine");
});

// ====================================
// WEB AUDIO API - SÍNTESE DE ÁUDIO
// ====================================

let audioContext = null;
let oscillator = null;
let gainNode = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playGeneratedAudio(type, frequency) {
  const ctx = getAudioContext();

  // Parar áudio anterior se estiver tocando
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (e) {
      // Ignorar erro se já foi parado
    }
    oscillator = null;
  }

  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  switch (type) {
    case "sine":
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      break;
    case "square":
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      break;
    case "noise":
      // Gerar ruído branco com buffer
      const bufferSize = ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      noiseSource.connect(gainNode);
      noiseSource.start();
      oscillator = noiseSource;
      return;
  }

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

  oscillator.start(ctx.currentTime);
}

function stopNote() {
  if (oscillator && audioContext) {
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    try {
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Ignorar erro
    }
    oscillator = null;
  }
}

function playNote(frequency) {
  const ctx = getAudioContext();

  if (oscillator) {
    try {
      oscillator.stop();
    } catch (e) {
      // Ignorar
    }
  }

  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  oscillator.start(ctx.currentTime);
}

// ====================================
// ANIMAÇÃO DE FREQUÊNCIAS
// ====================================

let frequencyAnimationActive = false;
let frequencyAnimationId = null;

function startFrequencyAnimation() {
  const canvas = document.getElementById("frequencyCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  frequencyAnimationActive = true;

  function animate() {
    const width = canvas.width;
    const height = canvas.height;

    // Limpar canvas com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f8f9fa");
    gradient.addColorStop(1, "#ecf0f1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Desenhar linha de zero
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Desenhar barras de frequência
    const barCount = 32;
    const barWidth = width / barCount;

    ctx.fillStyle = "#3498db";
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      const randomHeight = Math.random() * (height / 2);

      ctx.fillRect(x + 2, height / 2 - randomHeight, barWidth - 4, randomHeight);
    }

    // Labels
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Espectro de Frequências", 10, 25);
    ctx.font = "12px Arial";
    ctx.fillText("Baixas (Hz)", 10, height - 10);
    ctx.fillText("Altas (Hz)", width - 100, height - 10);

    if (frequencyAnimationActive) {
      frequencyAnimationId = requestAnimationFrame(animate);
    }
  }

  animate();
}

// ====================================
// FORMATOS DE ÁUDIO
// ====================================

function drawFormatsTable() {
  const canvas = document.getElementById("formatsTableCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  // Limpar canvas
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, width, height);

  // Dados da tabela
  const formats = [
    {
      name: "WAV",
      bitrate: "Sem compressão",
      quality: "Lossless",
      size: "Grande",
    },
    { name: "MP3", bitrate: "128-320 kbps", quality: "Lossy", size: "Pequeno" },
    {
      name: "FLAC",
      bitrate: "Sem compressão",
      quality: "Lossless",
      size: "Médio",
    },
    { name: "AAC", bitrate: "64-256 kbps", quality: "Lossy", size: "Pequeno" },
    { name: "OGG", bitrate: "64-500 kbps", quality: "Lossy", size: "Pequeno" },
  ];

  // Cabeçalho
  const headerY = 30;
  ctx.fillStyle = "#3498db";
  ctx.fillRect(10, headerY - 20, width - 20, 25);

  ctx.fillStyle = "white";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Formato", 20, headerY);
  ctx.fillText("Taxa de Bits", 150, headerY);
  ctx.fillText("Qualidade", 300, headerY);
  ctx.fillText("Tamanho", 450, headerY);

  // Linhas
  ctx.strokeStyle = "#bdc3c7";
  ctx.lineWidth = 1;

  let y = headerY + 10;
  formats.forEach((format, index) => {
    if (index % 2 === 0) {
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(10, y - 15, width - 20, 30);
    }

    ctx.fillStyle = "#2c3e50";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(format.name, 20, y);
    ctx.fillText(format.bitrate, 150, y);
    ctx.fillText(format.quality, 300, y);
    ctx.fillText(format.size, 450, y);

    y += 40;
  });
}

// ====================================
// FILTROS DE FREQUÊNCIA
// ====================================

function drawFrequencyResponse(filterType) {
  const canvas = document.getElementById("filterCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  // Limpar canvas
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, width, height);

  // Desenhar eixos
  ctx.strokeStyle = "#bdc3c7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, height - 50);
  ctx.lineTo(width - 20, height - 50);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(50, 20);
  ctx.lineTo(50, height - 50);
  ctx.stroke();

  // Desenhar resposta do filtro
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 3;
  ctx.beginPath();

  const centerFreq = 500;
  const responseHeight = height - 100;

  for (let i = 0; i < width - 70; i++) {
    const freq = (i / (width - 70)) * 1000;
    let response = 0;

    switch (filterType) {
      case "lowpass":
        response = 1 / (1 + Math.pow(freq / centerFreq, 2));
        break;
      case "highpass":
        response = Math.pow(freq / centerFreq, 2) / (1 + Math.pow(freq / centerFreq, 2));
        break;
      case "bandpass":
        const distance = Math.abs(freq - centerFreq);
        response = 1 / (1 + Math.pow(distance / 100, 2));
        break;
    }

    const x = 50 + i;
    const y = height - 50 - response * responseHeight;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#2c3e50";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Filtro ${filterType.toUpperCase()}`, 60, 30);
  ctx.font = "10px Arial";
  ctx.fillText("0 Hz", 40, height - 30);
  ctx.fillText("1000 Hz", width - 80, height - 30);

  ctx.save();
  ctx.translate(20, 100);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Ganho", 0, 0);
  ctx.restore();
}

// ====================================
// EQUALIZADOR
// ====================================

function drawEqualizer() {
  const canvas = document.getElementById("equalizerCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  // Limpar canvas
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, width, height);

  // Bandas de frequência
  const bands = [
    { freq: "60Hz", value: 0.6 },
    { freq: "250Hz", value: 0.4 },
    { freq: "1kHz", value: 0.8 },
    { freq: "4kHz", value: 0.5 },
    { freq: "8kHz", value: 0.7 },
    { freq: "16kHz", value: 0.3 },
  ];

  const barCount = bands.length;
  const barWidth = (width - 40) / barCount;
  const maxBarHeight = height - 100;

  ctx.fillStyle = "#34495e";
  ctx.fillRect(0, 0, width, height);

  bands.forEach((band, index) => {
    const x = 20 + index * barWidth;
    const barHeight = band.value * maxBarHeight;
    const y = height - 60 - barHeight;

    // Gradiente para as barras
    const barGradient = ctx.createLinearGradient(x, height - 60, x, y);
    barGradient.addColorStop(0, "#2ecc71");
    barGradient.addColorStop(1, "#27ae60");

    ctx.fillStyle = barGradient;
    ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

    // Borda
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y, barWidth - 10, barHeight);

    // Label
    ctx.fillStyle = "#ecf0f1";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(band.freq, x + barWidth / 2, height - 20);
  });

  // Título
  ctx.fillStyle = "#3498db";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Equalizador Gráfico", 20, 30);
}

// ====================================
// ESPECTRO EM TEMPO REAL
// ====================================

let spectrumAnimationActive = false;
let spectrumAnimationId = null;

function startSpectrumAnalyzer() {
  const canvas = document.getElementById("spectrumCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  spectrumAnimationActive = true;

  function animate() {
    const width = canvas.width;
    const height = canvas.height;

    // Efeito de fade
    ctx.fillStyle = "rgba(248, 249, 250, 0.1)";
    ctx.fillRect(0, 0, width, height);

    // Desenhar barras
    const barCount = 64;
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const hue = (i / barCount) * 360;
      const randomHeight = Math.random() * height;

      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(i * barWidth, height - randomHeight, barWidth - 2, randomHeight);
    }

    // Desenhar linha de eixo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    if (spectrumAnimationActive) {
      spectrumAnimationId = requestAnimationFrame(animate);
    }
  }

  animate();
}

// ====================================
// QUIZ INTERATIVO
// ====================================

const quizQuestions = [
  {
    question: "O que é amostragem (sampling) em áudio digital?",
    options: [
      "A conversão de um sinal analógico contínuo em amostras discretas em intervalos regulares",
      "A compressão de arquivo de áudio",
      "O processo de gravação de música original",
      "A criptografia de dados de áudio",
    ],
    correct: 0,
  },
  {
    question: "Qual é a taxa de amostragem padrão para CD de áudio?",
    options: ["22.05 kHz", "32 kHz", "44.1 kHz", "96 kHz"],
    correct: 2,
  },
  {
    question: "O que é a profundidade de bits (bit depth) em áudio?",
    options: [
      "A velocidade de reprodução do áudio",
      "O número de bits usados para representar cada amostra",
      "A quantidade de compressão aplicada",
      "A frequência máxima audível",
    ],
    correct: 1,
  },
  {
    question: "Qual formato de áudio oferece compressão sem perda de qualidade?",
    options: ["MP3", "AAC", "FLAC", "OGG"],
    correct: 2,
  },
  {
    question: "O que é a Transformada de Fourier em processamento de áudio?",
    options: [
      "Um método para aumentar o volume do áudio",
      "Um algoritmo para converter sinal do domínio do tempo para domínio da frequência",
      "Uma técnica de compressão de áudio",
      "Um filtro para remover ruído",
    ],
    correct: 1,
  },
  {
    question: "Qual é a frequência máxima que o ouvido humano pode perceber?",
    options: ["10 kHz", "15 kHz", "20 kHz", "30 kHz"],
    correct: 2,
  },
  {
    question: "O que é MIDI?",
    options: [
      "Um formato de compressão de áudio",
      "Um protocolo de controle que armazena instruções musicais, não áudio real",
      "Um tipo de microfone de estúdio",
      "Uma técnica de masterização de áudio",
    ],
    correct: 1,
  },
  {
    question: "Qual é o bitrate típico para MP3 de boa qualidade?",
    options: ["64 kbps", "128 kbps", "192-320 kbps", "500 kbps"],
    correct: 2,
  },
  {
    question: "O que é um filtro passa-baixo?",
    options: [
      "Um filtro que reduz o volume do áudio",
      "Um filtro que permite frequências altas e atenua frequências baixas",
      "Um filtro que permite frequências baixas e atenua frequências altas",
      "Um filtro que remove ruído completamente",
    ],
    correct: 2,
  },
  {
    question: "Qual é a relação entre taxa de amostragem e frequência máxima representável?",
    options: [
      "Não há relação",
      "A frequência máxima é igual à taxa de amostragem",
      "A frequência máxima é metade da taxa de amostragem (Teorema de Nyquist)",
      "A frequência máxima é o dobro da taxa de amostragem",
    ],
    correct: 2,
  },
  {
    question: "O que é quantização em áudio digital?",
    options: [
      "O processo de seleção de qual música ouvir",
      "O processo de mapear valores contínuos para valores discretos",
      "A velocidade de processamento de áudio",
      "O número de canais de áudio",
    ],
    correct: 1,
  },
  {
    question: "Qual é o tamanho aproximado de um minuto de áudio CD (44.1 kHz, 16 bits, estéreo)?",
    options: ["1 MB", "5 MB", "10 MB", "30 MB"],
    correct: 2,
  },
  {
    question: "O que é aliasing em áudio digital?",
    options: [
      "Um efeito de eco artificial",
      "Um artefato causado por amostragem inadequada que cria frequências falsas",
      "Uma técnica de compressão de áudio",
      "Um tipo de reverberação",
    ],
    correct: 1,
  },
  {
    question: "Qual é a diferença entre áudio mono e estéreo?",
    options: [
      "Estéreo tem melhor qualidade de áudio",
      "Mono usa um canal e estéreo usa dois canais para criar efeito de espacialidade",
      "Mono é para fala e estéreo para música",
      "Não há diferença significativa",
    ],
    correct: 1,
  },
  {
    question: "O que é dithering em processamento de áudio?",
    options: [
      "Um tipo de efeito reverberação",
      "Um processo de redução de bits depth que adiciona ruído de baixo nível para reduzir artefatos de quantização",
      "Uma técnica de compressão",
      "Um filtro para remover frequências altas",
    ],
    correct: 1,
  },
];

let selectedQuestions = [];
let userAnswers = {};

function startQuiz() {
  // Selecionar 5 perguntas aleatórias de 15
  selectedQuestions = [];
  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  selectedQuestions = shuffled.slice(0, 5);

  userAnswers = {};

  // Mostrar container de perguntas
  document.getElementById("quizIntro").style.display = "none";
  document.getElementById("quizQuestions").style.display = "block";
  document.getElementById("quizResults").style.display = "none";

  // Renderizar perguntas
  const questionsContent = document.getElementById("questionsContent");
  questionsContent.innerHTML = "";

  selectedQuestions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";

    let optionsHTML = "";
    q.options.forEach((option, optIndex) => {
      optionsHTML += `
                <label class="option">
                    <input type="radio" name="question-${index}" value="${optIndex}" onchange="selectAnswer(${index}, ${optIndex})">
                    ${option}
                </label>
            `;
    });

    questionDiv.innerHTML = `
            <h4><span class="question-number">Pergunta ${index + 1} de ${
              selectedQuestions.length
            }:</span> ${q.question}</h4>
            <div class="options">
                ${optionsHTML}
            </div>
        `;

    questionsContent.appendChild(questionDiv);
  });
}

function selectAnswer(questionIndex, optionIndex) {
  userAnswers[questionIndex] = optionIndex;

  // Atualizar visual da opção selecionada
  const labels = document.querySelectorAll(`input[name="question-${questionIndex}"]`);
  labels.forEach((label, index) => {
    const optionDiv = label.parentElement;
    if (index === optionIndex) {
      optionDiv.classList.add("selected");
    } else {
      optionDiv.classList.remove("selected");
    }
  });
}

function submitQuiz() {
  // Verificar se todas as perguntas foram respondidas
  if (Object.keys(userAnswers).length !== selectedQuestions.length) {
    alert("Por favor, responda todas as perguntas antes de enviar!");
    return;
  }

  // Calcular pontuação
  let correctAnswers = 0;
  selectedQuestions.forEach((q, index) => {
    if (userAnswers[index] === q.correct) {
      correctAnswers++;
    }
  });

  const percentage = Math.round((correctAnswers / selectedQuestions.length) * 100);

  // Mostrar resultados
  document.getElementById("quizIntro").style.display = "none";
  document.getElementById("quizQuestions").style.display = "none";
  document.getElementById("quizResults").style.display = "block";

  // Título do resultado
  let resultTitle = "";
  if (percentage === 100) {
    resultTitle = "🎉 Perfeito! Você acertou tudo!";
  } else if (percentage >= 80) {
    resultTitle = "✨ Excelente! Você tem ótimo conhecimento!";
  } else if (percentage >= 60) {
    resultTitle = "👍 Bom! Continue estudando!";
  } else if (percentage >= 40) {
    resultTitle = "📚 Regular! Revise os conceitos!";
  } else {
    resultTitle = "💪 Estude mais e tente novamente!";
  }

  document.getElementById("resultTitle").textContent = resultTitle;

  // Desenhar círculo de pontuação
  drawScoreCircle(percentage, correctAnswers, selectedQuestions.length);

  // Mostrar detalhes
  let detailsHTML = "<h4>Detalhes do Resultado:</h4>";
  detailsHTML += `<div class="result-item"><strong>Acertos:</strong> <span class="result-correct">${correctAnswers}/${selectedQuestions.length}</span></div>`;
  detailsHTML += `<div class="result-item"><strong>Percentual:</strong> <span class="result-correct">${percentage}%</span></div>`;
  detailsHTML += '<h4 style="margin-top: 1.5rem;">Revisão das Respostas:</h4>';

  selectedQuestions.forEach((q, index) => {
    const isCorrect = userAnswers[index] === q.correct;
    const userAnswerText = q.options[userAnswers[index]];
    const correctAnswerText = q.options[q.correct];

    detailsHTML += `
            <div class="result-item">
                <strong>Pergunta ${index + 1}:</strong> ${q.question}
                <br>
                <span class="${isCorrect ? "result-correct" : "result-incorrect"}">
                    ${isCorrect ? "✓ Correto" : "✗ Incorreto"}
                </span>
                <br>
                Sua resposta: ${userAnswerText}
                ${!isCorrect ? `<br>Resposta correta: ${correctAnswerText}` : ""}
            </div>
        `;
  });

  document.getElementById("resultDetails").innerHTML = detailsHTML;
}

function drawScoreCircle(percentage, correct, total) {
  const canvas = document.getElementById("scoreCanvas");
  const ctx = canvas.getContext("2d");

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 80;

  // Limpar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar círculo de fundo
  ctx.fillStyle = "#ecf0f1";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Desenhar círculo de progresso
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (percentage / 100) * Math.PI * 2;

  const gradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
  gradient.addColorStop(0, "#3498db");
  gradient.addColorStop(1, "#2980b9");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 6, startAngle, endAngle);
  ctx.stroke();

  // Texto do percentual
  ctx.fillStyle = "#2c3e50";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${percentage}%`, centerX, centerY - 10);

  // Texto de acertos
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#7f8c8d";
  ctx.fillText(`${correct}/${total} acertos`, centerX, centerY + 25);
}

function restartQuiz() {
  document.getElementById("quizIntro").style.display = "block";
  document.getElementById("quizQuestions").style.display = "none";
  document.getElementById("quizResults").style.display = "none";
  selectedQuestions = [];
  userAnswers = {};
}

// ====================================
// INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ====================================

window.addEventListener("load", () => {
  // Desenhar onda padrão
  drawWave("sine");

  // Iniciar com a seção home ativa
  goToSection("home");
});

// ====================================
// PARAR ANIMAÇÕES AO NAVEGAR
// ====================================

const originalGoToSection = goToSection;
window.goToSection = function (sectionId) {
  frequencyAnimationActive = false;
  spectrumAnimationActive = false;

  if (frequencyAnimationId) {
    cancelAnimationFrame(frequencyAnimationId);
  }
  if (spectrumAnimationId) {
    cancelAnimationFrame(spectrumAnimationId);
  }

  originalGoToSection(sectionId);
};

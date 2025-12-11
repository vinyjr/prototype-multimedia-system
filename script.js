// ====================================
// GERENCIAMENTO DE SEÇÕES
// ====================================

function goToHome() {
	goToSection("home");
}

function goToSection(sectionId) {
	const sections = document.querySelectorAll(".section");
	sections.forEach((section) => section.classList.remove("active"));

	const targetSection = document.getElementById(sectionId);
	if (targetSection) {
		targetSection.classList.add("active");
		window.scrollTo(0, 0);
	}
}

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

function stopNote() {
	if (oscillator && audioContext) {
		gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(
			0.01,
			audioContext.currentTime + 0.1,
		);
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
		} catch (e) {}
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

let midiSynth = null;
let isMidiPlaying = false;

async function playMIDI() {
	// Se está tocando, para tudo
	if (isMidiPlaying && midiSynth) {
		midiSynth.triggerRelease();
		isMidiPlaying = false;
		return;
	}

	try {
		// Garantir que Tone.js está iniciado
		if (Tone.Synth.prototype.triggerAttackRelease) {
			await Tone.start();
		}

		const response = await fetch("./assets/audios/music.mid");
		const buffer = await response.arrayBuffer();
		const midi = new Midi(buffer);

		// Criar novo sintetizador
		midiSynth = new Tone.PolySynth(Tone.Synth, {
			oscillator: { type: "triangle" },
			envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
		}).toDestination();

		isMidiPlaying = true;

		midi.tracks.forEach((track) => {
			track.notes.forEach((note) => {
				midiSynth.triggerAttackRelease(
					note.name,
					note.duration,
					note.time,
					note.velocity,
				);
			});
		});

		// Marcar como finalizado após a última nota
		const totalDuration = midi.tracks.reduce((max, track) => {
			const trackDuration = Math.max(
				...track.notes.map(
					(n) => (n.time || 0) + (parseFloat(n.duration) || 0),
				),
			);
			return Math.max(max, trackDuration);
		}, 0);

		setTimeout(
			() => {
				isMidiPlaying = false;
			},
			(totalDuration + 1) * 1000,
		);
	} catch (error) {
		console.error("Erro ao tocar MIDI:", error);
		isMidiPlaying = false;
	}
}

// ====================================
// PIANO INTERATIVO COM NOTAS MIDI
// ====================================

let pianoSynth = null;
let isAudioInitialized = false;
let midiNotes = [];

async function initPianoAudio() {
	if (!isAudioInitialized) {
		await Tone.start();
		pianoSynth = new Tone.Synth({
			oscillator: { type: "triangle" },
			envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
		}).toDestination();
		isAudioInitialized = true;

		await loadMidiNotes();
	}
}

async function loadMidiNotes() {
	try {
		const response = await fetch("./assets/audios/music.mid");
		if (!response.ok) {
			console.warn(
				"Não foi possível carregar o arquivo MIDI para o piano interativo",
			);
			return;
		}

		const buffer = await response.arrayBuffer();
		const midi = new Midi(buffer);

		// Extrair todas as notas únicas do arquivo MIDI
		const notesSet = new Set();
		midi.tracks.forEach((track) => {
			track.notes.forEach((note) => {
				notesSet.add(note.name);
			});
		});

		midiNotes = Array.from(notesSet).sort();
		console.log("Notas MIDI carregadas:", midiNotes);

		// Atualizar display das notas carregadas
		updateMidiNotesDisplay();
	} catch (error) {
		console.warn("Erro ao carregar notas MIDI:", error);
		updateMidiNotesDisplay();
	}
}

function updateMidiNotesDisplay() {
	const notesLoadedElement = document.getElementById("notesLoaded");
	if (!notesLoadedElement) return;

	if (midiNotes.length > 0) {
		notesLoadedElement.textContent = midiNotes.join(", ");
		notesLoadedElement.style.color = "var(--success-color)";
	} else {
		notesLoadedElement.textContent =
			"Usando notas padrão (C4, D4, E4, F4, G4, A4, B4)";
		notesLoadedElement.style.color = "var(--gray-color)";
	}
}

function playTone(note) {
	initPianoAudio().then(() => {
		if (pianoSynth) {
			// Reproduzir a nota com duração de colcheia
			pianoSynth.triggerAttackRelease(note, "8n");

			// Feedback visual - adicionar animação à tecla
			const buttons = document.querySelectorAll(".key");
			buttons.forEach((btn) => {
				if (btn.textContent.trim() === note.charAt(0)) {
					btn.style.transform = "translateY(-4px)";
					setTimeout(() => {
						btn.style.transform = "translateY(0)";
					}, 100);
				}
			});
		}
	});
}

// ====================================
// QUIZ
// ====================================

const quizQuestions = [
	{
		question: "As vibrações sonoras se propagam como ondas de quê?",
		options: [
			"Ondas de calor",
			"Ondas de pressão atmosférica",
			"Sinais magnéticos",
			"Tensão de áudio",
		],
		correct: 1,
	},
	{
		question: "O que é um alto-falante em termos de transdução?",
		options: [
			"Um transdutor de acústico para elétrico (como um microfone).",
			"Um transdutor de elétrico para acústico.",
			"Um dispositivo para armazenar sinais magnéticos.",
			"Um quantizador de sinal.",
		],
		correct: 1,
	},
	{
		question:
			"Qual é a principal desvantagem da representação analógica do som?",
		options: [
			"A dificuldade de conversão para formato digital (PCM).",
			"A necessidade de frequências de amostragem muito altas.",
			"Estar sujeita à contaminação por ruído em todas as transformações.",
			"Ser propagada apenas como ondas de pressão.",
		],
		correct: 2,
	},
	{
		question:
			"No processo de digitalização, o que o ADC (Conversor Analógico-Digital) faz?",
		options: [
			"Converte um sinal digital de volta para um sinal analógico.",
			"Armazena o sinal digitalizado.",
			"Recebe o sinal analógico e o prepara para o sistema digital.",
			"Filtra o ruído de quantização.",
		],
		correct: 2,
	},
	{
		question: "Qual das opções a seguir representa o áudio não comprimido?",
		options: [
			"MP3 (MPEG camada 3)",
			"ADPCM (codificação diferencial adaptativa)",
			"WMA (Windows Media Audio)",
			"PCM (Modulação por Código de Pulso)",
		],
		correct: 3,
	},
	{
		question:
			"Qual é o termo usado para as unidades mínimas de som na representação digital?",
		options: ["Bits", "Vibrações", "Amostras de som", "Sinais analógicos"],
		correct: 2,
	},
	{
		question: "Um microfone é um exemplo de transdutor que converte:",
		options: [
			"Sinal elétrico para acústico.",
			"Sinal digital para analógico.",
			"Acústico (som) para elétrico.",
			"Sinais magnéticos para vibrações.",
		],
		correct: 2,
	},
	{
		question:
			"Qual é o dispositivo usado para converter um sinal de Analógico para Digital?",
		options: ["DAC", "PCM", "ADC", "DAT"],
		correct: 2,
	},
	{
		question: "O que é uma onda senoidal no contexto das vibrações sonoras?",
		options: [
			"Uma forma complexa que pode ser analisada por Fourier.",
			"A forma mais simples de vibração sonora.",
			"Apenas a combinação de ondas complexas.",
			"Uma onda de pressão atmosférica.",
		],
		correct: 1,
	},
	{
		question: "Qual é o primeiro passo no processo de digitalização do som ?",
		options: [
			"Amostragem",
			"Quantização",
			"Filtragem analógica",
			"Codificação",
		],
		correct: 2,
	},
	{
		question:
			"O que acontece com a qualidade e o armazenamento se a taxa de amostragem for maior?",
		options: [
			"A amostragem é mais precisa, mas a quantidade de informação armazenada é menor.",
			"A amostragem é menos precisa, mas a quantidade de informação armazenada é maior.",
			"A amostragem é mais precisa, e a quantidade de informação armazenada é maior.",
			"Não há alteração na precisão nem na quantidade de informação.",
		],
		correct: 2,
	},
	{
		question:
			"Qual é o formato de arquivo de áudio tipicamente não compactado (não comprimido) e que usa a extensão .wav?",
		options: ["MP3", "Real Áudio (Ra, ram)", "WAV", "WMA"],
		correct: 2,
	},
	{
		question:
			"Qual termo descreve operações de processamento digital de som feitas sobre as amostras separadas (e não sobre sequências)?",
		options: [
			"Processamento no domínio da frequência",
			"Processamento de compressão",
			"Processamento no domínio do tempo",
			"Processamento de codificação",
		],
		correct: 2,
	},
	{
		question:
			"No caso dos sinais de voz, a faixa de frequência de interesse vai tipicamente de 300Hz a qual valor (para garantir 85% da inteligibilidade)?",
		options: ["8000 Hz", "3400 Hz", "44100 Hz", "125 ms"],
		correct: 1,
	},
	{
		question:
			"Qual das seguintes formas de codificação de áudio é um exemplo de MPEG camada 3?",
		options: ["PCM", "ADPCM", "MP3", "AC-3"],
		correct: 2,
	},
];

let selectedQuestions = [];
let userAnswers = {};

function startQuiz() {
	selectedQuestions = [];
	const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
	selectedQuestions = shuffled.slice(0, 5);

	userAnswers = {};

	document.getElementById("quizIntro").style.display = "none";
	document.getElementById("quizQuestions").style.display = "block";
	document.getElementById("quizResults").style.display = "none";

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

	const labels = document.querySelectorAll(
		`input[name="question-${questionIndex}"]`,
	);
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
	if (Object.keys(userAnswers).length !== selectedQuestions.length) {
		alert("Por favor, responda todas as perguntas antes de enviar!");
		return;
	}

	let correctAnswers = 0;
	selectedQuestions.forEach((q, index) => {
		if (userAnswers[index] === q.correct) {
			correctAnswers++;
		}
	});

	const percentage = Math.round(
		(correctAnswers / selectedQuestions.length) * 100,
	);

	document.getElementById("quizIntro").style.display = "none";
	document.getElementById("quizQuestions").style.display = "none";
	document.getElementById("quizResults").style.display = "block";

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

function restartQuiz() {
	document.getElementById("quizIntro").style.display = "block";
	document.getElementById("quizQuestions").style.display = "none";
	document.getElementById("quizResults").style.display = "none";
	selectedQuestions = [];
	userAnswers = {};
}

function drawScoreCircle(percentage, correct, total) {
	const canvas = document.getElementById("scoreCanvas");
	if (!canvas) return;

	const ctx = canvas.getContext("2d");
	const centerX = 100;
	const centerY = 100;
	const radius = 80;

	// Limpar canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Círculo de fundo
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
	ctx.strokeStyle = "#e0e0e0";
	ctx.lineWidth = 15;
	ctx.stroke();

	// Círculo de progresso
	const startAngle = -Math.PI / 2;
	const endAngle = startAngle + (2 * Math.PI * percentage) / 100;

	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, startAngle, endAngle);

	// Cor baseada na pontuação
	if (percentage >= 80) {
		ctx.strokeStyle = "#2ecc71"; // Verde
	} else if (percentage >= 60) {
		ctx.strokeStyle = "#3498db"; // Azul
	} else if (percentage >= 40) {
		ctx.strokeStyle = "#f39c12"; // Laranja
	} else {
		ctx.strokeStyle = "#e74c3c"; // Vermelho
	}

	ctx.lineWidth = 15;
	ctx.lineCap = "round";
	ctx.stroke();

	// Texto da porcentagem
	ctx.fillStyle = "#2c3e50";
	ctx.font = "bold 36px 'Segoe UI', sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(`${percentage}%`, centerX, centerY - 10);

	// Texto de acertos
	ctx.font = "16px 'Segoe UI', sans-serif";
	ctx.fillStyle = "#7f8c8d";
	ctx.fillText(`${correct}/${total}`, centerX, centerY + 20);
}

// ====================================
// PARAR ANIMAÇÕES AO NAVEGAR
// ====================================

const originalGoToSection = goToSection;
window.goToSection = (sectionId) => {
	originalGoToSection(sectionId);
};

function playAudio(audioPath, vol = 0.2) {
	const audio = new Audio(audioPath);

	//Definir volume
	audio.volume = Math.max(0.0, Math.min(1.0, vol));

	audio.play();

	setTimeout(() => {
		audio.pause();
		audio.currentTime = 0;
	}, 2000);
}

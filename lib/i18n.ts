import { LanguageCode } from './types';

export interface TranslationDictionary {
  brand: {
    title: string;
    subtitle: string;
    schedule: string;
    venue: string;
  };
  nav: {
    hub: string;
    moderator: string;
    display: string;
    settings: string;
    openDisplayWindow: string;
  };
  hub: {
    headline: string;
    description: string;
    moderatorCardTitle: string;
    moderatorCardDesc: string;
    moderatorCta: string;
    displayCardTitle: string;
    displayCardDesc: string;
    displayCta: string;
    settingsCardTitle: string;
    settingsCardDesc: string;
    settingsCta: string;
    pairingTitle: string;
    pairingDesc: string;
    pairCodeLabel: string;
    scanQrHint: string;
    activeRoundSummary: string;
  };
  connection: {
    connected: string;
    reconnecting: string;
    disconnected: string;
    reloadingState: string;
    moderatorCount: string;
    displayCount: string;
    laptopBridgeReady: string;
    laptopBridgeMissing: string;
    unauthorizedTitle: string;
    unauthorizedDesc: string;
    enterPairCodePlaceholder: string;
    pairButton: string;
    invalidPairCode: string;
  };
  moderator: {
    listenButton: string;
    listeningActive: string;
    stopListening: string;
    cancelListening: string;
    transcribing: string;
    recordingWindowHint: string;
    activeSourceLaptop: string;
    activeSourcePhone: string;
    laptopBridgeArm: string;
    laptopBridgeArmed: string;
    laptopBridgeHelp: string;
    proposalTitle: string;
    confirmAndPublish: string;
    discardProposal: string;
    directModeBadge: string;
    confirmationModeBadge: string;
    manualEntryTitle: string;
    manualInputPlaceholder: string;
    publishManual: string;
    quickBoardTitle: string;
    showQuickBoard: string;
    hideQuickBoard: string;
    recentDrawsTitle: string;
    noDrawsYet: string;
    undoLastDraw: string;
    undoConfirmTitle: string;
    undoConfirmDesc: string;
    newRound: string;
    newRoundConfirmTitle: string;
    newRoundConfirmDesc: string;
    confirmAction: string;
    cancelAction: string;
    alreadyDrawnTag: string;
    roundLabel: string;
    drawnCountLabel: string;
    lastNumberLabel: string;
    inputLevelLabel: string;
    micPermissionDenied: string;
    micNotFound: string;
    liveVoiceActivate: string;
    liveVoiceDeactivate: string;
    liveVoiceActiveStatus: string;
    liveVoiceInactiveHint: string;
    liveTranscriptLabel: string;
    liveAutoPublishOn: string;
    liveAutoPublishOff: string;
    singleShotFallback: string;
  };
  speechStatus: {
    valid: string;
    already_drawn: string;
    ambiguous: string;
    out_of_range: string;
    empty: string;
    unintelligible: string;
    stale_ignored: string;
    speechNotConfigured: string;
    speechError: string;
    candidatesLabel: string;
    tapCandidateToUse: string;
  };
  display: {
    title: string;
    round: string;
    drawn: string;
    lastNumber: string;
    waitingForFirstDraw: string;
    justDrawn: string;
    fullscreenEnter: string;
    fullscreenExit: string;
    readOnlyNote: string;
    openNumbersLegend: string;
    drawnNumbersLegend: string;
    lastNumberLegend: string;
  };
  settings: {
    title: string;
    protectedNotice: string;
    deviceSectionTitle: string;
    deviceSectionDesc: string;
    eventSectionTitle: string;
    eventSectionDesc: string;
    uiLanguageLabel: string;
    displayLanguageLabel: string;
    speechLanguageLabel: string;
    speechAuto: string;
    speechEs: string;
    speechEn: string;
    speechDe: string;
    audioSourceLabel: string;
    audioSourceLaptop: string;
    audioSourcePhone: string;
    audioSourceHelp: string;
    micDeviceLabel: string;
    defaultMic: string;
    refreshMics: string;
    micTestStart: string;
    micTestStop: string;
    micTestHint: string;
    captureDurationLabel: string;
    secondsUnit: string;
    publishModeLabel: string;
    confirmationModeLabel: string;
    confirmationModeDesc: string;
    directModeLabel: string;
    directModeDesc: string;
    directModeConfirmTitle: string;
    directModeConfirmDesc: string;
    ballDurationLabel: string;
    animationIntensityLabel: string;
    intensityCalm: string;
    intensityStandard: string;
    intensityFestive: string;
    reducedMotionLabel: string;
    beamerScaleLabel: string;
    beamerMarginsLabel: string;
    soundEffectsLabel: string;
    soundVolumeLabel: string;
    saveSuccess: string;
    pairingSectionTitle: string;
    copyPairLink: string;
    linkCopied: string;
    regeneratePairCode: string;
    beamerGuideTitle: string;
    beamerGuideStep1: string;
    beamerGuideStep2: string;
    beamerGuideStep3: string;
    beamerGuideStep4: string;
    historyTitle: string;
    noArchivedRounds: string;
    roundHeader: string;
    startedAt: string;
    endedAt: string;
    activeNow: string;
    drawOrder: string;
    correctionsTitle: string;
    noCorrections: string;
    exportCsv: string;
    exportJson: string;
    clearHistoryButton: string;
    clearHistoryConfirmTitle: string;
    clearHistoryConfirmDesc: string;
  };
  languages: Record<LanguageCode, string>;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  es: {
    brand: {
      title: 'World Family Bingo',
      subtitle: 'World Family Bar · Fisterra',
      schedule: 'Todos los martes · 21:30',
      venue: 'World Family · Fisterra',
    },
    nav: {
      hub: 'Inicio',
      moderator: 'Moderador',
      display: 'Pantalla público',
      settings: 'Ajustes e historial',
      openDisplayWindow: 'Abrir ventana proyector',
    },
    hub: {
      headline: 'World Family Bingo',
      description:
        'Control en directo para el bingo presencial de los martes en Fisterra. Extrae la bola física, anuncia el número y sincroniza al instante el móvil, el portátil y el proyector.',
      moderatorCardTitle: 'Consola de moderación',
      moderatorCardDesc:
        'Botón de escucha por voz, propuesta con confirmación, teclado manual 1–90, deshacer y nueva ronda.',
      moderatorCta: 'Abrir moderador',
      displayCardTitle: 'Pantalla del público (16:9)',
      displayCardDesc:
        'Ventana independiente de solo lectura para el proyector con tablero completo 1–90 y bola disco animada.',
      displayCta: 'Abrir pantalla proyector',
      settingsCardTitle: 'Ajustes e historial',
      settingsCardDesc:
        'Idiomas independientes, fuente de micrófono, modo de confirmación, guía de proyector y exportación CSV/JSON.',
      settingsCta: 'Abrir ajustes',
      pairingTitle: 'Vincular teléfono móvil',
      pairingDesc:
        'Escanea el código QR con la cámara del móvil o introduce el código de sesión para controlar la partida de forma autorizada.',
      pairCodeLabel: 'Código de sesión',
      scanQrHint: 'Enlace directo de moderación autorizada',
      activeRoundSummary: 'Ronda actual',
    },
    connection: {
      connected: 'Sincronizado en tiempo real',
      reconnecting: 'Reconectando con el servidor…',
      disconnected: 'Sin conexión con el servidor',
      reloadingState: 'Recargando estado oficial de la partida…',
      moderatorCount: 'Moderadores',
      displayCount: 'Proyectores',
      laptopBridgeReady: 'Micrófono del portátil listo',
      laptopBridgeMissing: 'Portátil no conectado como fuente de audio',
      unauthorizedTitle: 'Autorización de moderador requerida',
      unauthorizedDesc:
        'Solo los dispositivos autorizados pueden anunciar números, corregir o reiniciar rondas. Introduce el código privado de sesión.',
      enterPairCodePlaceholder: 'Código de 6 dígitos',
      pairButton: 'Vincular dispositivo',
      invalidPairCode: 'Código incorrecto. Verifica el código mostrado en el portátil.',
    },
    moderator: {
      listenButton: 'Escuchar número',
      listeningActive: 'Ventana de escucha abierta…',
      stopListening: 'Procesar ahora',
      cancelListening: 'Cancelar',
      transcribing: 'Analizando voz…',
      recordingWindowHint:
        'Escucha puntual activada manualmente. Sin escucha pasiva.',
      activeSourceLaptop: 'Fuente activa: Micrófono del portátil',
      activeSourcePhone: 'Fuente activa: Micrófono del móvil',
      laptopBridgeArm: 'Activar captura de audio en este portátil',
      laptopBridgeArmed: 'Este portátil escucha las órdenes del móvil',
      laptopBridgeHelp:
        'Activa esta opción en el portátil conectado al mezclador para disparar la escucha desde tu móvil.',
      proposalTitle: 'Número detectado',
      confirmAndPublish: 'Confirmar y publicar',
      discardProposal: 'Descartar',
      directModeBadge: 'Modo directo activo',
      confirmationModeBadge: 'Modo confirmación activo',
      manualEntryTitle: 'Entrada manual (1–90)',
      manualInputPlaceholder: 'Ej. 36',
      publishManual: 'Publicar número',
      quickBoardTitle: 'Tablero rápido 1–90',
      showQuickBoard: 'Mostrar tablero 1–90',
      hideQuickBoard: 'Ocultar tablero 1–90',
      recentDrawsTitle: 'Últimos números cantados',
      noDrawsYet: 'Aún no ha salido ningún número en esta ronda.',
      undoLastDraw: 'Deshacer último número',
      undoConfirmTitle: '¿Deshacer el último número?',
      undoConfirmDesc:
        'Se retirará el último número cantado de la ronda actual y quedará registrado en el historial de correcciones.',
      newRound: 'Nueva ronda',
      newRoundConfirmTitle: '¿Iniciar una nueva ronda?',
      newRoundConfirmDesc:
        'La ronda actual se archivará en el historial, se detendrán las capturas activas y el tablero 1–90 volverá a quedar vacío.',
      confirmAction: 'Confirmar',
      cancelAction: 'Cancelar',
      alreadyDrawnTag: 'Ya salió',
      roundLabel: 'Ronda',
      drawnCountLabel: 'Cantados',
      lastNumberLabel: 'Último',
      inputLevelLabel: 'Nivel de entrada',
      micPermissionDenied:
        'Permiso de micrófono denegado. Autoriza el acceso en el navegador o usa la entrada manual.',
      micNotFound:
        'No se encontró ningún micrófono disponible en este dispositivo.',
      liveVoiceActivate: 'Activar reconocimiento de voz en directo',
      liveVoiceDeactivate: 'Desactivar reconocimiento de voz',
      liveVoiceActiveStatus: 'Escucha en directo activa · Di el número',
      liveVoiceInactiveHint:
        'Actívalo para reconocer al instante cada número (ES/EN/DE) y mostrarlo en el proyector automáticamente.',
      liveTranscriptLabel: 'En tiempo real',
      liveAutoPublishOn: 'Mostrar directo en proyector',
      liveAutoPublishOff: 'Pedir confirmación',
      singleShotFallback: 'Toma única rápida',
    },
    speechStatus: {
      valid: 'Número reconocido con claridad.',
      already_drawn: 'Este número ya había salido en esta ronda. No se volverá a registrar.',
      ambiguous:
        'Se escucharon varios números distintos en la misma toma. No se modificó la partida.',
      out_of_range:
        'Número fuera del rango permitido (solo enteros del 1 al 90).',
      empty: 'No se detectó voz suficiente durante la ventana de escucha.',
      unintelligible:
        'No se pudo identificar un número claro entre 1 y 90.',
      stale_ignored:
        'Resultado tardío de una captura cancelada o ronda anterior descartado.',
      speechNotConfigured:
        'El reconocimiento de voz en servidor requiere configuración de API. La entrada manual sigue completamente operativa.',
      speechError:
        'No se pudo completar el reconocimiento de voz. Utiliza la entrada manual o vuelve a intentarlo.',
      candidatesLabel: 'Números detectados',
      tapCandidateToUse: 'Toca uno si deseas proponerlo:',
    },
    display: {
      title: 'BINGO',
      round: 'Ronda',
      drawn: 'Cantados',
      lastNumber: 'Último número',
      waitingForFirstDraw: 'Esperando primera bola',
      justDrawn: 'Recién salido',
      fullscreenEnter: 'Pantalla completa',
      fullscreenExit: 'Salir de pantalla completa',
      readOnlyNote: 'Solo lectura · Proyector',
      openNumbersLegend: 'Pendiente',
      drawnNumbersLegend: 'Cantado',
      lastNumberLegend: 'Último',
    },
    settings: {
      title: 'Ajustes e historial',
      protectedNotice: 'Área de administración protegida del evento',
      deviceSectionTitle: 'Preferencias de este dispositivo',
      deviceSectionDesc:
        'Estas opciones se guardan solo en este navegador y no afectan al resto de dispositivos.',
      eventSectionTitle: 'Ajustes compartidos del evento',
      eventSectionDesc:
        'Se sincronizan inmediatamente con el portátil, el móvil y la pantalla del proyector.',
      uiLanguageLabel: 'Idioma de esta interfaz de moderación',
      displayLanguageLabel: 'Idioma de la pantalla del público',
      speechLanguageLabel: 'Idioma de reconocimiento de voz',
      speechAuto: 'Detección automática (ES / EN / DE)',
      speechEs: 'Español',
      speechEn: 'English',
      speechDe: 'Deutsch',
      audioSourceLabel: 'Fuente de audio activa (una sola a la vez)',
      audioSourceLaptop: 'Micrófono del portátil / mezclador (preferido)',
      audioSourcePhone: 'Micrófono del teléfono móvil',
      audioSourceHelp:
        'La aplicación nunca reproduce el micrófono por los altavoces; solo captura breves fragmentos bajo demanda.',
      micDeviceLabel: 'Dispositivo de entrada en este equipo',
      defaultMic: 'Micrófono predeterminado del sistema',
      refreshMics: 'Actualizar lista',
      micTestStart: 'Probar micrófono',
      micTestStop: 'Detener prueba',
      micTestHint:
        'Habla cerca del micrófono para comprobar el nivel antes de empezar el bingo.',
      captureDurationLabel: 'Duración máxima de escucha',
      secondsUnit: 'seg',
      publishModeLabel: 'Publicación de números por voz',
      confirmationModeLabel: 'Modo confirmación (recomendado)',
      confirmationModeDesc:
        'Muestra el número reconocido en el móvil y espera tu confirmación.',
      directModeLabel: 'Modo directo (sin confirmación extra)',
      directModeDesc:
        'Publica automáticamente solo si se reconoce un único número válido y nuevo dentro de la ventana.',
      directModeConfirmTitle: '¿Activar modo directo?',
      directModeConfirmDesc:
        'Si se reconoce un único número válido (1–90) no repetido, aparecerá directamente en el proyector sin botón de confirmación.',
      ballDurationLabel: 'Duración de la bola grande en proyector',
      animationIntensityLabel: 'Intensidad de animación',
      intensityCalm: 'Suave',
      intensityStandard: 'Estándar',
      intensityFestive: 'Festiva',
      reducedMotionLabel: 'Movimiento reducido (sin destellos ni giros)',
      beamerScaleLabel: 'Tamaño de textos y números del proyector',
      beamerMarginsLabel: 'Márgenes de seguridad del proyector',
      soundEffectsLabel: 'Efectos de sonido discretos en proyector',
      soundVolumeLabel: 'Volumen de efectos',
      saveSuccess: 'Ajustes guardados y sincronizados.',
      pairingSectionTitle: 'Conexión de dispositivos',
      copyPairLink: 'Copiar enlace de vinculación',
      linkCopied: 'Enlace copiado',
      regeneratePairCode: 'Generar nuevo código',
      beamerGuideTitle: 'Guía rápida para el proyector (pantalla extendida)',
      beamerGuideStep1:
        '1. En el portátil, configura la pantalla externa en modo "Extender pantalla" (no duplicar), para ver el moderador en el portátil y el tablero en el proyector.',
      beamerGuideStep2:
        '2. Pulsa "Abrir ventana proyector" para abrir la ruta dedicada /display en una ventana aparte.',
      beamerGuideStep3:
        '3. Arrastra esa ventana hacia el escritorio del proyector.',
      beamerGuideStep4:
        '4. Pulsa el botón "Pantalla completa" en la esquina superior derecha de esa ventana (o F11).',
      historyTitle: 'Historial de rondas',
      noArchivedRounds: 'Todavía no hay rondas archivadas.',
      roundHeader: 'Ronda',
      startedAt: 'Inicio',
      endedAt: 'Fin',
      activeNow: 'En curso',
      drawOrder: 'Orden de salida',
      correctionsTitle: 'Registro de correcciones',
      noCorrections: 'Sin correcciones registradas.',
      exportCsv: 'Exportar CSV',
      exportJson: 'Exportar JSON',
      clearHistoryButton: 'Borrar todo el historial',
      clearHistoryConfirmTitle: '¿Borrar permanentemente el historial?',
      clearHistoryConfirmDesc:
        'Esta acción eliminará todas las rondas archivadas y el registro de correcciones. La ronda actual no se reiniciará.',
    },
    languages: {
      es: 'Español',
      en: 'English',
      de: 'Deutsch',
    },
  },
  en: {
    brand: {
      title: 'World Family Bingo',
      subtitle: 'World Family Bar · Fisterra',
      schedule: 'Every Tuesday · 21:30',
      venue: 'World Family · Fisterra',
    },
    nav: {
      hub: 'Home',
      moderator: 'Host Remote',
      display: 'Audience Display',
      settings: 'Settings & History',
      openDisplayWindow: 'Open Beamer Window',
    },
    hub: {
      headline: 'World Family Bingo',
      description:
        'Live companion for Tuesday night Bingo in Fisterra. Draw physical balls from the drum, announce numbers, and keep smartphone, laptop, and beamer synchronized.',
      moderatorCardTitle: 'Host Control Remote',
      moderatorCardDesc:
        'Push-to-listen voice capture, confirmation proposal, manual 1–90 entry, undo, and round control.',
      moderatorCta: 'Open Host Remote',
      displayCardTitle: 'Audience Beamer Display (16:9)',
      displayCardDesc:
        'Dedicated read-only window for the projector with full 1–90 board and animated disco ball.',
      displayCta: 'Open Beamer Display',
      settingsCardTitle: 'Settings & Round History',
      settingsCardDesc:
        'Separate languages, mic source, confirmation mode, projector guide, and CSV/JSON export.',
      settingsCta: 'Open Settings',
      pairingTitle: 'Pair Your Smartphone',
      pairingDesc:
        'Scan the QR code with your phone camera or enter the private pairing code to authorize your remote.',
      pairCodeLabel: 'Session Pairing Code',
      scanQrHint: 'Direct authorized host link',
      activeRoundSummary: 'Current Round',
    },
    connection: {
      connected: 'Live synchronized',
      reconnecting: 'Reconnecting to server…',
      disconnected: 'Disconnected from server',
      reloadingState: 'Reloading authoritative game state…',
      moderatorCount: 'Hosts',
      displayCount: 'Displays',
      laptopBridgeReady: 'Laptop microphone ready',
      laptopBridgeMissing: 'Laptop audio source not connected',
      unauthorizedTitle: 'Host Authorization Required',
      unauthorizedDesc:
        'Only paired host devices may publish numbers, undo draws, or reset rounds. Enter the private session code.',
      enterPairCodePlaceholder: '6-digit pairing code',
      pairButton: 'Pair Device',
      invalidPairCode: 'Incorrect pairing code. Check the code displayed on your laptop.',
    },
    moderator: {
      listenButton: 'Listen for Number',
      listeningActive: 'Listening window open…',
      stopListening: 'Process Now',
      cancelListening: 'Cancel',
      transcribing: 'Recognizing speech…',
      recordingWindowHint:
        'Manual push-to-listen window. No background listening.',
      activeSourceLaptop: 'Active source: Laptop microphone',
      activeSourcePhone: 'Active source: Smartphone microphone',
      laptopBridgeArm: 'Enable audio capture on this laptop',
      laptopBridgeArmed: 'This laptop is armed for remote triggers',
      laptopBridgeHelp:
        'Enable this on the laptop connected to your mixer so the smartphone button triggers laptop capture.',
      proposalTitle: 'Recognized Number',
      confirmAndPublish: 'Confirm & Publish',
      discardProposal: 'Discard',
      directModeBadge: 'Direct mode active',
      confirmationModeBadge: 'Confirmation mode active',
      manualEntryTitle: 'Manual Entry (1–90)',
      manualInputPlaceholder: 'e.g. 36',
      publishManual: 'Publish Number',
      quickBoardTitle: 'Quick 1–90 Board',
      showQuickBoard: 'Show 1–90 Board',
      hideQuickBoard: 'Hide 1–90 Board',
      recentDrawsTitle: 'Recently Drawn',
      noDrawsYet: 'No numbers drawn yet in this round.',
      undoLastDraw: 'Undo Last Number',
      undoConfirmTitle: 'Undo the last drawn number?',
      undoConfirmDesc:
        'The most recent number will be removed from the active round and recorded in the correction log.',
      newRound: 'New Round',
      newRoundConfirmTitle: 'Start a new round?',
      newRoundConfirmDesc:
        'The current round will be archived in history, active captures will stop, and the 1–90 board will reset to empty.',
      confirmAction: 'Confirm',
      cancelAction: 'Cancel',
      alreadyDrawnTag: 'Already drawn',
      roundLabel: 'Round',
      drawnCountLabel: 'Drawn',
      lastNumberLabel: 'Last',
      inputLevelLabel: 'Input level',
      micPermissionDenied:
        'Microphone permission denied. Allow mic access in browser settings or use manual entry.',
      micNotFound: 'No microphone input found on this device.',
      liveVoiceActivate: 'Activate Live Voice Recognition',
      liveVoiceDeactivate: 'Turn Off Voice Recognition',
      liveVoiceActiveStatus: 'Live voice active · Speak any number',
      liveVoiceInactiveHint:
        'Toggle on to recognize spoken numbers (ES/EN/DE) in real time and display them directly on the beamer.',
      liveTranscriptLabel: 'Live transcript',
      liveAutoPublishOn: 'Display directly on beamer',
      liveAutoPublishOff: 'Require confirmation',
      singleShotFallback: 'Quick single capture',
    },
    speechStatus: {
      valid: 'Number clearly recognized.',
      already_drawn: 'This number was already drawn in this round and will not be added again.',
      ambiguous:
        'Multiple distinct numbers were heard in one capture. Game state was not changed.',
      out_of_range:
        'Number is out of range (only integers from 1 to 90 are valid).',
      empty: 'No clear speech detected inside the listening window.',
      unintelligible:
        'Could not recognize a clear Bingo number between 1 and 90.',
      stale_ignored:
        'Late result from a cancelled capture or previous round was discarded.',
      speechNotConfigured:
        'Server speech transcription requires API key configuration. Manual entry remains fully functional.',
      speechError:
        'Speech recognition failed. Use manual entry or try listening again.',
      candidatesLabel: 'Detected numbers',
      tapCandidateToUse: 'Tap one to propose it:',
    },
    display: {
      title: 'BINGO',
      round: 'Round',
      drawn: 'Drawn',
      lastNumber: 'Last Number',
      waitingForFirstDraw: 'Waiting for first ball',
      justDrawn: 'Just drawn',
      fullscreenEnter: 'Fullscreen',
      fullscreenExit: 'Exit Fullscreen',
      readOnlyNote: 'Read-only · Beamer',
      openNumbersLegend: 'Open',
      drawnNumbersLegend: 'Drawn',
      lastNumberLegend: 'Last',
    },
    settings: {
      title: 'Settings & History',
      protectedNotice: 'Protected event administration area',
      deviceSectionTitle: 'This Device Preferences',
      deviceSectionDesc:
        'Stored locally for this browser only and does not affect other connected devices.',
      eventSectionTitle: 'Shared Event Settings',
      eventSectionDesc:
        'Synchronized live across laptop, smartphone remote, and audience beamer.',
      uiLanguageLabel: 'This host interface language',
      displayLanguageLabel: 'Audience beamer display language',
      speechLanguageLabel: 'Speech recognition language',
      speechAuto: 'Automatic detection (ES / EN / DE)',
      speechEs: 'Español',
      speechEn: 'English',
      speechDe: 'Deutsch',
      audioSourceLabel: 'Active audio source (strictly one at a time)',
      audioSourceLaptop: 'Laptop microphone / audio mixer (preferred)',
      audioSourcePhone: 'Smartphone microphone',
      audioSourceHelp:
        'The app never routes microphone audio back to speakers; it only captures short clips on command.',
      micDeviceLabel: 'Input device on this machine',
      defaultMic: 'System default microphone',
      refreshMics: 'Refresh devices',
      micTestStart: 'Test Microphone',
      micTestStop: 'Stop Test',
      micTestHint:
        'Speak into your venue mic to verify the input meter before the game starts.',
      captureDurationLabel: 'Max listening window',
      secondsUnit: 'sec',
      publishModeLabel: 'Voice publish mode',
      confirmationModeLabel: 'Confirmation mode (recommended)',
      confirmationModeDesc:
        'Shows the recognized number on your remote and waits for your publish tap.',
      directModeLabel: 'Direct mode (no extra tap)',
      directModeDesc:
        'Publishes immediately only when one unambiguous, valid, undrawn number is recognized.',
      directModeConfirmTitle: 'Enable Direct Mode?',
      directModeConfirmDesc:
        'When enabled, a single valid undrawn number (1–90) recognized in the window will appear on the beamer automatically without confirmation.',
      ballDurationLabel: 'Large ball spotlight duration',
      animationIntensityLabel: 'Animation intensity',
      intensityCalm: 'Calm',
      intensityStandard: 'Standard',
      intensityFestive: 'Festive',
      reducedMotionLabel: 'Reduced motion (no sparkles or spins)',
      beamerScaleLabel: 'Beamer text & number scale',
      beamerMarginsLabel: 'Beamer safe screen margins',
      soundEffectsLabel: 'Subtle chime sound effects on display',
      soundVolumeLabel: 'Effect volume',
      saveSuccess: 'Settings saved and synchronized.',
      pairingSectionTitle: 'Device Pairing & Access',
      copyPairLink: 'Copy pairing link',
      linkCopied: 'Link copied',
      regeneratePairCode: 'Generate new code',
      beamerGuideTitle: 'Extended Beamer & Fullscreen Guide',
      beamerGuideStep1:
        '1. Set your laptop display settings to "Extend displays" (not Mirror) so the host console stays private on your laptop.',
      beamerGuideStep2:
        '2. Click "Open Beamer Window" to launch the dedicated /display window.',
      beamerGuideStep3:
        '3. Drag that browser window over onto the extended beamer screen.',
      beamerGuideStep4:
        '4. Click the "Fullscreen" button in the top-right corner of the display window (or press F11).',
      historyTitle: 'Round History',
      noArchivedRounds: 'No archived rounds yet.',
      roundHeader: 'Round',
      startedAt: 'Started',
      endedAt: 'Ended',
      activeNow: 'Active now',
      drawOrder: 'Draw sequence',
      correctionsTitle: 'Correction Audit Log',
      noCorrections: 'No corrections logged.',
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
      clearHistoryButton: 'Clear All History',
      clearHistoryConfirmTitle: 'Permanently clear archived history?',
      clearHistoryConfirmDesc:
        'This deletes all archived rounds and correction logs. Your active round stays intact.',
    },
    languages: {
      es: 'Español',
      en: 'English',
      de: 'Deutsch',
    },
  },
  de: {
    brand: {
      title: 'World Family Bingo',
      subtitle: 'World Family Bar · Fisterra',
      schedule: 'Jeden Dienstag · 21:30 Uhr',
      venue: 'World Family · Fisterra',
    },
    nav: {
      hub: 'Start',
      moderator: 'Moderator',
      display: 'Publikumsanzeige',
      settings: 'Einstellungen & Historie',
      openDisplayWindow: 'Beamer-Fenster öffnen',
    },
    hub: {
      headline: 'World Family Bingo',
      description:
        'Begleit-App für den echten Bingo-Abend am Dienstag in Fisterra. Physische Kugeln ziehen, ansagen und Smartphone, Laptop und Beamer in Echtzeit synchronisieren.',
      moderatorCardTitle: 'Moderator-Steuerung',
      moderatorCardDesc:
        'Knopfdruck-Spracherfassung, Bestätigungsvorschlag, manuelle 1–90-Eingabe, Rücknahme und Rundensteuerung.',
      moderatorCta: 'Moderator öffnen',
      displayCardTitle: 'Publikumsanzeige (16:9 Beamer)',
      displayCardDesc:
        'Eigenes reines Lesefenster für den Beamer mit 1–90-Raster und animierter Disco-Bingo-Kugel.',
      displayCta: 'Publikumsanzeige öffnen',
      settingsCardTitle: 'Einstellungen & Historie',
      settingsCardDesc:
        'Getrennte Sprachen, Mikrofonquelle, Bestätigungs- oder Direktmodus, Beamer-Anleitung und CSV/JSON-Export.',
      settingsCta: 'Einstellungen öffnen',
      pairingTitle: 'Smartphone koppeln',
      pairingDesc:
        'Scanne den QR-Code mit der Handykamera oder gib den privaten Kopplungscode ein, um das Smartphone zu autorisieren.',
      pairCodeLabel: 'Kopplungscode',
      scanQrHint: 'Direkter autorisierter Moderator-Link',
      activeRoundSummary: 'Laufende Runde',
    },
    connection: {
      connected: 'Live synchronisiert',
      reconnecting: 'Verbindung wird wiederhergestellt…',
      disconnected: 'Keine Serververbindung',
      reloadingState: 'Aktueller Spielstand wird neu geladen…',
      moderatorCount: 'Moderatoren',
      displayCount: 'Beamer',
      laptopBridgeReady: 'Laptop-Mikrofon bereit',
      laptopBridgeMissing: 'Laptop-Audioquelle nicht verbunden',
      unauthorizedTitle: 'Moderator-Autorisierung erforderlich',
      unauthorizedDesc:
        'Nur gekoppelte Moderatorgeräte dürfen Zahlen veröffentlichen, korrigieren oder Runden zurücksetzen.',
      enterPairCodePlaceholder: '6-stelliger Kopplungscode',
      pairButton: 'Gerät koppeln',
      invalidPairCode: 'Ungültiger Code. Prüfe den Code auf dem Laptop.',
    },
    moderator: {
      listenButton: 'Zahl hören',
      listeningActive: 'Aufnahmefenster geöffnet…',
      stopListening: 'Jetzt auswerten',
      cancelListening: 'Abbrechen',
      transcribing: 'Sprache wird erkannt…',
      recordingWindowHint:
        'Gezieltes Aufnahmefenster per Knopfdruck. Kein dauerhaftes Mithören.',
      activeSourceLaptop: 'Aktive Quelle: Laptop-Mikrofon / Mischpult',
      activeSourcePhone: 'Aktive Quelle: Smartphone-Mikrofon',
      laptopBridgeArm: 'Audioerfassung auf diesem Laptop aktivieren',
      laptopBridgeArmed: 'Dieser Laptop wartet auf Handy-Auslöser',
      laptopBridgeHelp:
        'Auf dem Laptop am Mischpult aktivieren, damit der Handyknopf das Aufnahmefenster auf dem Laptop startet.',
      proposalTitle: 'Erkannte Zahl',
      confirmAndPublish: 'Bestätigen & Veröffentlichen',
      discardProposal: 'Verwerfen',
      directModeBadge: 'Direktmodus aktiv',
      confirmationModeBadge: 'Bestätigungsmodus aktiv',
      manualEntryTitle: 'Manuelle Eingabe (1–90)',
      manualInputPlaceholder: 'z. B. 36',
      publishManual: 'Zahl eintragen',
      quickBoardTitle: 'Schnellwahl-Raster 1–90',
      showQuickBoard: 'Raster 1–90 anzeigen',
      hideQuickBoard: 'Raster 1–90 ausblenden',
      recentDrawsTitle: 'Zuletzt gezogene Zahlen',
      noDrawsYet: 'In dieser Runde wurde noch keine Zahl gezogen.',
      undoLastDraw: 'Letzte Ziehung zurücknehmen',
      undoConfirmTitle: 'Letzte Ziehung zurücknehmen?',
      undoConfirmDesc:
        'Die zuletzt eingetragene Zahl wird aus der laufenden Runde entfernt und im Korrekturprotokoll vermerkt.',
      newRound: 'Neue Runde',
      newRoundConfirmTitle: 'Neue Runde starten?',
      newRoundConfirmDesc:
        'Die laufende Runde wird archiviert, aktive Erfassungen und Animationen werden beendet und alle 90 Zahlen wieder freigegeben.',
      confirmAction: 'Bestätigen',
      cancelAction: 'Abbrechen',
      alreadyDrawnTag: 'Bereits gezogen',
      roundLabel: 'Runde',
      drawnCountLabel: 'Gezogen',
      lastNumberLabel: 'Letzte',
      inputLevelLabel: 'Eingangspegel',
      micPermissionDenied:
        'Mikrofonberechtigung verweigert. Bitte im Browser freigeben oder manuelle Eingabe nutzen.',
      micNotFound: 'Kein Mikrofon auf diesem Gerät gefunden.',
      liveVoiceActivate: 'Live-Spracherkennung aktivieren',
      liveVoiceDeactivate: 'Spracherkennung deaktivieren',
      liveVoiceActiveStatus: 'Live-Erkennung aktiv · Zahl einfach ansagen',
      liveVoiceInactiveHint:
        'Aktivieren, um gesprochene Zahlen (DE/ES/EN) direkt in Echtzeit zu erkennen und sofort auf dem Beamer anzuzeigen.',
      liveTranscriptLabel: 'Live-Erkennung',
      liveAutoPublishOn: 'Direkt auf Beamer anzeigen',
      liveAutoPublishOff: 'Vorher bestätigen',
      singleShotFallback: 'Schnelle Einzelaufnahme',
    },
    speechStatus: {
      valid: 'Zahl eindeutig erkannt.',
      already_drawn:
        'Diese Zahl wurde in dieser Runde bereits gezogen und wird nicht erneut eingetragen.',
      ambiguous:
        'Mehrere unterschiedliche Zahlen erkannt. Der Spielstand wurde nicht verändert.',
      out_of_range:
        'Zahl außerhalb des gültigen Bereichs (nur ganze Zahlen von 1 bis 90).',
      empty: 'Keine verständliche Sprache im Aufnahmefenster erkannt.',
      unintelligible:
        'Keine eindeutige Bingo-Zahl zwischen 1 und 90 verstanden.',
      stale_ignored:
        'Verspätetes Ergebnis einer abgebrochenen Erfassung oder vorherigen Runde verworfen.',
      speechNotConfigured:
        'Die serverseitige Spracherkennung benötigt eine konfigurierte API. Die manuelle Eingabe bleibt jederzeit nutzbar.',
      speechError:
        'Spracherkennung fehlgeschlagen. Nutze die manuelle Eingabe oder starte eine neue Erfassung.',
      candidatesLabel: 'Erkannte Zahlen',
      tapCandidateToUse: 'Tippe eine Zahl an, um sie vorzuschlagen:',
    },
    display: {
      title: 'BINGO',
      round: 'Runde',
      drawn: 'Gezogen',
      lastNumber: 'Letzte Zahl',
      waitingForFirstDraw: 'Warte auf erste Kugel',
      justDrawn: 'Gerade gezogen',
      fullscreenEnter: 'Vollbild',
      fullscreenExit: 'Vollbild beenden',
      readOnlyNote: 'Nur Anzeige · Beamer',
      openNumbersLegend: 'Offen',
      drawnNumbersLegend: 'Gezogen',
      lastNumberLegend: 'Letzte',
    },
    settings: {
      title: 'Einstellungen & Historie',
      protectedNotice: 'Geschützter Verwaltungsbereich',
      deviceSectionTitle: 'Persönliche Geräteeinstellungen',
      deviceSectionDesc:
        'Gelten nur lokal in diesem Browser und verändern andere Geräte nicht.',
      eventSectionTitle: 'Gemeinsame Veranstaltungseinstellungen',
      eventSectionDesc:
        'Werden sofort zwischen Laptop, Smartphone und Beamer synchronisiert.',
      uiLanguageLabel: 'Sprache dieser Moderatoroberfläche',
      displayLanguageLabel: 'Sprache der Publikumsanzeige',
      speechLanguageLabel: 'Sprache der Spracherkennung',
      speechAuto: 'Automatische Erkennung (ES / EN / DE)',
      speechEs: 'Español',
      speechEn: 'English',
      speechDe: 'Deutsch',
      audioSourceLabel: 'Aktive Audioquelle (immer genau eine)',
      audioSourceLaptop: 'Laptop-Mikrofon / Mischpult-Eingang (bevorzugt)',
      audioSourcePhone: 'Smartphone-Mikrofon',
      audioSourceHelp:
        'Die App gibt kein Mikrofonsignal über Lautsprecher aus, sondern nimmt nur kurze Fenster auf Knopfdruck auf.',
      micDeviceLabel: 'Eingabegerät an diesem Computer/Handy',
      defaultMic: 'Systemstandard-Mikrofon',
      refreshMics: 'Geräte aktualisieren',
      micTestStart: 'Mikrofontest starten',
      micTestStop: 'Mikrofontest beenden',
      micTestHint:
        'Sprich ins Mikrofon, um den Eingangspegel vor Veranstaltungsbeginn zu prüfen.',
      captureDurationLabel: 'Maximale Dauer des Aufnahmefensters',
      secondsUnit: 'Sek.',
      publishModeLabel: 'Veröffentlichung nach Spracherkennung',
      confirmationModeLabel: 'Bestätigungsmodus (Standard empfohlen)',
      confirmationModeDesc:
        'Zeigt den Vorschlag auf dem Smartphone an und wartet auf deine Bestätigung.',
      directModeLabel: 'Direktmodus (ohne Zusatzklick)',
      directModeDesc:
        'Veröffentlicht automatisch nur bei einer eindeutig erkannten, gültigen und noch offenen Zahl.',
      directModeConfirmTitle: 'Direktmodus bewusst aktivieren?',
      directModeConfirmDesc:
        'Eine eindeutig erkannte, noch nicht gezogene Zahl (1–90) wird ohne weitere Rückfrage direkt auf dem Beamer veröffentlicht.',
      ballDurationLabel: 'Anzeigedauer der großen Kugel',
      animationIntensityLabel: 'Animationsintensität',
      intensityCalm: 'Ruhig',
      intensityStandard: 'Standard',
      intensityFestive: 'Festlich',
      reducedMotionLabel: 'Reduzierte Bewegung (ohne Glanzblitze/Drehung)',
      beamerScaleLabel: 'Schrift- und Zahlenvergrößerung (Beamer)',
      beamerMarginsLabel: 'Sichere Bildschirmränder (Beamer)',
      soundEffectsLabel: 'Optionale Effekttöne auf der Anzeige',
      soundVolumeLabel: 'Effekt-Lautstärke',
      saveSuccess: 'Einstellungen gespeichert und synchronisiert.',
      pairingSectionTitle: 'Gerätekopplung & Zugriff',
      copyPairLink: 'Kopplungs-Link kopieren',
      linkCopied: 'Link kopiert',
      regeneratePairCode: 'Neuen Code erzeugen',
      beamerGuideTitle: 'Anleitung: Beamer-Anzeige & Vollbild',
      beamerGuideStep1:
        '1. Stelle am Laptop die Bildschirme auf „Erweitern“ (nicht „Duplizieren“), damit nur das Publikum die Anzeige sieht.',
      beamerGuideStep2:
        '2. Öffne über „Beamer-Fenster öffnen“ die eigene Ansicht /display in einem separaten Browserfenster.',
      beamerGuideStep3:
        '3. Ziehe dieses Browserfenster mit der Maus auf den erweiterten Beamer-Bildschirm.',
      beamerGuideStep4:
        '4. Klicke dort oben rechts auf „Vollbild“ (oder drücke F11).',
      historyTitle: 'Rundenhistorie',
      noArchivedRounds: 'Noch keine abgeschlossenen Runden vorhanden.',
      roundHeader: 'Runde',
      startedAt: 'Start',
      endedAt: 'Ende',
      activeNow: 'Läuft aktuell',
      drawOrder: 'Ziehungsreihenfolge',
      correctionsTitle: 'Korrekturprotokoll',
      noCorrections: 'Keine Korrekturen protokolliert.',
      exportCsv: 'Als CSV exportieren',
      exportJson: 'Als JSON exportieren',
      clearHistoryButton: 'Gesamte Historie löschen',
      clearHistoryConfirmTitle: 'Gesamte Historie unwiderruflich löschen?',
      clearHistoryConfirmDesc:
        'Alle archivierten Runden und das Korrekturprotokoll werden gelöscht. Die laufende Runde bleibt erhalten.',
    },
    languages: {
      es: 'Español',
      en: 'English',
      de: 'Deutsch',
    },
  },
};

export function getDictionary(lang: LanguageCode | undefined): TranslationDictionary {
  return TRANSLATIONS[lang ?? 'es'] ?? TRANSLATIONS.es;
}

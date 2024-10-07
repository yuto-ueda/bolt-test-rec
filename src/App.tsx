import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, FileText, Trash2, Upload } from 'lucide-react';

function App() {
  // 状態の定義
  const [isRecording, setIsRecording] = useState(false); // 録音中かどうかを管理
  const [transcript, setTranscript] = useState(''); // 確定した文字起こし結果を保存
  const [interimTranscript, setInterimTranscript] = useState(''); // 中間の文字起こし結果を保存
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // アップロードされたファイルを保存
  const recognitionRef = useRef<SpeechRecognition | null>(null); // 音声認識オブジェクトの参照を保持
  const isRecordingRef = useRef(false); // 録音状態を参照として保持（useEffect内で使用）
  const audioRef = useRef<HTMLAudioElement | null>(null); // 音声再生用のAudio要素の参照
  const audioContextRef = useRef<AudioContext | null>(null); // AudioContext の参照を保持

  useEffect(() => {
    // ブラウザが音声認識をサポートしているか確認
    if ('webkitSpeechRecognition' in window) {
      // 音声認識オブジェクトの作成
      const speechRecognition = new webkitSpeechRecognition();
      speechRecognition.continuous = true; // 連続的に認識を行う
      speechRecognition.interimResults = true; // 中間結果を有効にする
      speechRecognition.lang = 'ja-JP'; // 日本語に設定

      // 音声認識の結果を処理するイベントハンドラ
      speechRecognition.onresult = (event) => {
        let currentInterimTranscript = '';
        let finalTranscript = '';

        // 認識結果を反復処理
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // 最終結果の場合、確定した文字起こしに追加
            finalTranscript += transcriptPart;
          } else {
            // 中間結果の場合、現在の中間文字起こしに追加
            currentInterimTranscript += transcriptPart;
          }
        }

        // 状態を更新
        setTranscript((prev) => prev + finalTranscript); // 確定した文字起こしを累積
        setInterimTranscript(currentInterimTranscript); // 中間結果を設定
      };

      // 音声認識が終了したときのイベントハンドラ
      speechRecognition.onend = () => {
        // まだ録音中の場合、再度開始する
        if (isRecordingRef.current) {
          speechRecognition.start();
        }
      };

      // 作成した音声認識オブジェクトを参照として保存
      recognitionRef.current = speechRecognition;
    } else {
      console.error('Speech recognition not supported');
    }

    // AudioContext の初期化
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();

    // コンポーネントのクリーンアップ時に音声認識を停止
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // 空の依存配列で、このeffectは初回レンダリング時のみ実行

  // 録音の開始/停止を切り替える関数
  const toggleRecording = () => {
    if (isRecording) {
      // 録音中なら停止
      recognitionRef.current?.stop();
    } else {
      // 停止中なら開始
      setInterimTranscript(''); // 中間結果をクリア
      recognitionRef.current?.start(); // 音声認識開始
    }
    setIsRecording(!isRecording); // 録音状態を反転
    isRecordingRef.current = !isRecording; // 参照も更新
  };

  // 文字起こし結果をクリアする関数
  const clearTranscript = () => {
    setTranscript(''); // 確定した文字起こしをクリア
    setInterimTranscript(''); // 中間結果をクリア
    setUploadedFile(null); // アップロードされたファイルをクリア
    if (audioRef.current) {
      audioRef.current.src = ''; // 音声ファイルの参照をクリア
    }
  };

  // ファイルがアップロードされたときの処理
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // ここで音声ファイルを音声要素にセット
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(file);
      }

      try {
        // ファイルを AudioBuffer に変換
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(
          arrayBuffer
        );

        // 音声認識の開始
        await transcribeAudio(audioBuffer);
      } catch (error) {
        console.error('Error processing audio file:', error);
        setTranscript('音声ファイルの処理中にエラーが発生しました。');
      }
    }
  };

  // 音声バッファを文字起こしする関数
  const transcribeAudio = async (audioBuffer: AudioBuffer) => {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    let currentTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      currentTranscript += finalTranscript;
      setTranscript(currentTranscript);
      setInterimTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      setTranscript((prev) => prev + '\n音声認識中にエラーが発生しました。');
    };

    recognition.onend = () => {
      setInterimTranscript('');
      console.log('Recognition ended');
    };

    // AudioBuffer を再生しながら認識を開始
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current!.destination);
    source.start();

    recognition.start();

    // 音声の長さだけ待機
    await new Promise((resolve) =>
      setTimeout(resolve, audioBuffer.duration * 1000)
    );

    recognition.stop();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">音声文字起こしアプリ</h1>
      <div className="flex space-x-4 mb-8">
        {/* 録音開始/停止ボタン */}
        <button
          onClick={toggleRecording}
          className={`flex items-center justify-center p-4 rounded-full ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-bold transition-colors duration-300`}
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          <span className="ml-2">{isRecording ? '停止' : '録音開始'}</span>
        </button>
        {/* クリアボタン */}
        <button
          onClick={clearTranscript}
          className="flex items-center justify-center p-4 rounded-full bg-gray-500 hover:bg-gray-600 text-white font-bold transition-colors duration-300"
        >
          <Trash2 size={24} />
          <span className="ml-2">クリア</span>
        </button>
      </div>
      {/* 文字起こし結果表示エリア */}
      <div className="w-full max-w-2xl">
        <div className="bg-white shadow-md rounded-lg p-6 max-h-96 overflow-y-auto">
          <div className="flex items-center mb-4">
            <FileText size={24} className="text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold">文字起こし結果</h2>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">
            {transcript}
            {/* 確定した文字起こし結果 */}
            <span className="text-gray-400">{interimTranscript}</span>
            {/* 中間結果 */}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

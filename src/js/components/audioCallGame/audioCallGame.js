import renderStartPage from './renderStartPage';
import { renderDropdown, renderGamePage } from './renderGamePage';
import { getRoundData } from '../../API/dataAPI';
import { getPartSpeech } from './partOfSpeech';
import { statisticsWords } from './statistics';

const arrTrueAnswer = [];
const arrFalseAnswer = [];
let option = true;
let arrAllWordsOption = [];
let numberWordCount = 0;
let levelGame = 1;
let roundGame = 1;

function clearAnswers() {
  arrTrueAnswer.length = 0;
  arrFalseAnswer.length = 0;
}

function optionAnswer(event, wordRus, wordEn, optionSound) {
  const gameBtn = document.querySelector('.game .game__btn.button');
  const getWordRus = event.target.parentElement;
  const getWordRusText = getWordRus.lastElementChild.outerText;
  const allWords = document.querySelectorAll('.words__item');
  const gameActive = document.querySelector('.game');

  option = optionSound;

  gameActive.classList.add('active');

  if (getWordRusText === wordRus) {
    arrTrueAnswer.push(wordEn);
    
    const audioElement = new Audio('../../../assets/audio/correct.mp3');

    if (option) {
      audioElement.play();
    }
    
    allWords.forEach(e => {
      e.classList.remove('true');
      e.classList.add('false');
      e.style.transition = '0.2s';
    });
    getWordRus.classList.remove('false');
    getWordRus.classList.add('true');
  } else {
    arrFalseAnswer.push(wordEn);

    const audioElement = new Audio('../../../assets/audio/error.mp3');

    if (option) {
      audioElement.play();
    }

    allWords.forEach(e => {
      e.classList.add('false');
      e.style.transition = '0.2s';
      if (wordRus === e.lastElementChild.outerText) {
        e.classList.add('true');
      }
    });
    getWordRus.classList.add('line-through');
  }
  gameBtn.innerText = 'Далее';
}

function getWords(newArrObjectWords) {
  const numberOfRound = 20;
  const objectGameWords = [];
  for (let i = 0; i < numberOfRound; i += 1) {
    objectGameWords.push(newArrObjectWords[i]);
  }
  return objectGameWords;
}

function shuffleWords (array) {
  array.sort(() => Math.random() - 0.5);
}

function startGame() {
  const newArrObjectWords = arrAllWordsOption;
  const objectGameWords = getWords(newArrObjectWords);

  if (numberWordCount === objectGameWords.length) {
    const numberRoundEnd = 30;
    const gameBtn = document.querySelector('.game .game__btn.button');
    gameBtn.innerText = 'Статистика';
    statisticsWords(arrTrueAnswer, arrFalseAnswer);
    document.querySelector('.statistics-audioCall').classList.remove('modal-audioCall-hidden');
    document.querySelector('.modal__btn_audiocallGame').addEventListener('click', () => {
      clearAnswers();
      numberWordCount = 0;  
      if (Number(roundGame) === numberRoundEnd) {
        console.log('я тут и уже 30 раундов, пора повышать уровень');
        levelGame += 1;
        roundGame = 0;
      }
      roundGame += 1;
      getDataAPI(levelGame, roundGame);
    });

  } else {
    const wordEn = objectGameWords[numberWordCount].word;
    const voiceEn = objectGameWords[numberWordCount].audio;
    const imageEn = objectGameWords[numberWordCount].image;
    const wordRus = objectGameWords[numberWordCount].wordTranslate;
    const wordPartSpeech = objectGameWords[numberWordCount].partOfSpeech;
    const endIndexWords = 4;
  
    let arrWordsRus = [];
  
    for (let i = 0; i < newArrObjectWords.length; i += 1) {
      if (wordPartSpeech === newArrObjectWords[i].partOfSpeech && wordRus !== newArrObjectWords[i].wordTranslate) {
        arrWordsRus.push(newArrObjectWords[i].wordTranslate);
      }
    }
  
    shuffleWords(arrWordsRus);
    arrWordsRus = arrWordsRus.slice(0, endIndexWords);
  
    arrWordsRus.push(wordRus);
    shuffleWords(arrWordsRus);
  
    document.querySelector('.game').remove();
  
    const pageContent = document.querySelector('.page');
    pageContent.append(renderGamePage(arrWordsRus, wordEn, voiceEn, imageEn));
    pageContent.append(renderDropdown());
  
    console.log(levelGame, roundGame)
  
    document.getElementById('lvl-select').value = levelGame;
    document.getElementById('rnd-select').value = roundGame;
  
    const audioBtn = document.querySelector('.game__voice');
    const gameWords = document.querySelector('.game__words');
    const gameBtn = document.querySelector('.game .game__btn.button');
    const soundImg = document.querySelector('.game__iconSound');
  
    if (option) {
      soundImg.classList.remove('active');
    } else {
      soundImg.classList.add('active');
    }
  
    soundImg.addEventListener('click', (event) => {
      if (option) {
        option = false;
      } else {
        option = true;
      }
      event.target.classList.toggle('active');
    });
  
    audioBtn.addEventListener('click', () => {
      const audioElement = new Audio(`https://raw.githubusercontent.com/irinainina/rslang-data/master/${voiceEn}`);
      audioElement.play();
    });
  
    gameBtn.addEventListener('click', (event) => {
      if (event.target.outerText === 'НЕ ЗНАЮ') {
        optionAnswer(event, wordRus, wordEn, option);
        numberWordCount += 1;
      } else {
        startGame();
      }
    });
  
    gameWords.addEventListener('click', (event) => {
      if (event.target.parentElement.className === 'words__item') {
        numberWordCount += 1;
        optionAnswer(event, wordRus, wordEn, option);
      }
    });
  
    getLevelAndRound();
  }
}

async function getPartOfSpeech(objectWords) {

  arrAllWordsOption = objectWords;

  const promises = [];
  if (objectWords) {
    objectWords.forEach((value, index) => {
      const wordCheck = objectWords[index].word;
      promises.push(getPartSpeech(wordCheck));
    });
    const wordsPartOfSpeech = await Promise.all(promises);
    if (wordsPartOfSpeech) {
      wordsPartOfSpeech.forEach((value, index) => {
        arrAllWordsOption[index].partOfSpeech = value[0].meanings[0].partOfSpeechCode;
      });
    }
  }
}

async function getDataAPI(levelGame, roundGame) {

  let level = levelGame;
  let round = roundGame;
  const wordsPerRound = 20;
  let data = [];

  if (levelGame === undefined || roundGame === undefined) {
    console.log('я тут и ничего не делаю');
    level = 1;
    round = 1;
    data = await getRoundData(level, round, wordsPerRound);
  } else {
    console.log('я тут и меняю уровень');
    level = Number(level);
    round = Number(round);
    data = await getRoundData(level, round, wordsPerRound);
    setTimeout(startGame, 1000);
  }

  let objectWords = [];

  objectWords = data;

  console.log(objectWords);

  getPartOfSpeech(objectWords);
}

function getLevelAndRound() {
  const numberLever = document.getElementById('lvl-select');
  const numberRound = document.getElementById('rnd-select');
  numberLever.onchange = () => {
    clearAnswers();
    numberWordCount = 0;
    levelGame = numberLever.value;
    getDataAPI(levelGame, roundGame);
  }
  numberRound.onchange = () => {
    clearAnswers();
    numberWordCount = 0;
    roundGame = numberRound.value;
    getDataAPI(levelGame, roundGame);
  }
}

export default function initAudioCallGame() {
  const pageContent = document.querySelector('.page');
  pageContent.append(renderStartPage());
  numberWordCount = 0;
  getDataAPI();
  clearAnswers();
  document.querySelector('.game__start').addEventListener('click', () => {  
    startGame();
  });
}

export { getDataAPI }
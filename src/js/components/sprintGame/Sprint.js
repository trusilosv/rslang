import ContentBuilder from './modules/ContentBuilder';
import { getRoundData } from '../../API/dataAPI';
import ErrorSound from '../../../assets/audio/error.mp3';
import CorrectSound from '../../../assets/audio/correct.mp3';
import GameEndSound from '../../../assets/audio/game-end.mp3';
import StatisticsAPI from '../../API/statisticsAPI';
import UserSettingsMiniGame from '../../API/userSettingsMiniGameAPI';
import getFilteredUserWords from '../../API/userAggregatedWordsAPI';

class Sprint {
  constructor() {
    this.gameContainer = `
      <div class='sprint__panel'></div>
    `;
    this.gameContainerSelector = '.sprint__panel';
    this.gameName = 'Спринт';
    this.isMyWords = true;
    this.gameLevel = 1;
    this.gameRound = 1;
    this.wordsPerRound = 100;
    this.wordsMaxAmount = 3600;
    this.filesUrlPrefix = 'https://raw.githubusercontent.com/DenisKhatsuk/rslang-data/master/';
    this.soundIsEnabled = true;
    this.curtainTimerStartPoint = 3;
    this.gameTimerStartPoint = 60;
    this.currentRewardPoints = 10;
    this.maxRewardPoints = 160;
    this.currentStack = 0;
    this.maxStack = 4;
    this.gameDuration = 60000;
    this.gameDelay = 3000;
    this.highlightDuration = 200;
    this.audioCorrect = new Audio(CorrectSound);
    this.audioWrong = new Audio(ErrorSound);
    this.gameEnd = new Audio(GameEndSound);
    this.highlightClassCorrect = 'border__correct';
    this.highlightClassWrong = 'border__wrong';
  }

  init(parentSelector = '.page') {
    const parent = document.querySelector(parentSelector);
    const closeButton = document.querySelector('.close-btn');
    const controlPanel = document.querySelector('.sprint__panel_right');
    const reloadButton = document.querySelector('.game-controls__reload');
    const myWordsSwitch = document.querySelector('.sprint__panel_right .slider');
    const clearGameFeatures = () => {
      closeButton.classList.remove('exit');
      closeButton.removeEventListener('click', clearGameFeatures);
      document.removeEventListener('keydown', this.keyboardListener);
      if (controlPanel) controlPanel.removeEventListener('click', this.soundControlButtonListener);
      if (reloadButton) reloadButton.removeEventListener('click', this.reloadButtonListener);
      if (myWordsSwitch) myWordsSwitch.removeEventListener('click', this.myWordsSwitchListener);
      if (this.board) this.board.removeEventListener('click', this.boardButtonsListener);
      clearTimeout(this.currentTimer);
    };
    closeButton.classList.add('exit');
    closeButton.addEventListener('click', clearGameFeatures);
    parent.innerHTML = this.gameContainer;
    ContentBuilder.addStartPageContent(this.gameContainerSelector, this.gameName);
    this.launchStartScreen();
  }

  launchStartScreen() {
    const startButton = document.querySelector('.curtain__button_start');
    startButton.addEventListener('click', () => {
      this.launchGame();
    });
  }

  async launchGame() {
    let wordsApiArray = {};
    const getLevelRoundWords = async () => {
      const { level, round } = await UserSettingsMiniGame.getUserSettingsMiniGame('sprint');
        this.gameLevel = level;
        this.gameRound = round;
        const wordsByLevelRound = await getRoundData(this.gameLevel, this.gameRound, this.wordsPerRound);
        return wordsByLevelRound;
    };

    if (this.isMyWords) {
      const FILTER_FOR_MINI_GAME_WORDS = encodeURIComponent('{"$and":[{"$or":[{"userWord.optional.status":"repeat"},{"userWord.optional.status":"tricky"}],"userWord.optional.daysLeftToRepeat":0}]}');
      wordsApiArray = await getFilteredUserWords(FILTER_FOR_MINI_GAME_WORDS, this.wordsMaxAmount);
      wordsApiArray = wordsApiArray[0].paginatedResults;

      if (wordsApiArray.length < this.wordsPerRound) {
        this.isMyWords = !this.isMyWords;
        this.enoughWords = false;
        wordsApiArray = await getLevelRoundWords();
      } else {
        const randomIndex = Sprint.getRandomInteger(wordsApiArray.length - 1 - this.wordsPerRound);
        wordsApiArray = wordsApiArray.slice(randomIndex, randomIndex + this.wordsPerRound);
        this.enoughWords = true;
      }
    } else {
      wordsApiArray = await getLevelRoundWords();
      this.enoughWords = true;
    }

    if (wordsApiArray.error) {
      ContentBuilder.showErrorMessage('.sprint__curtain');
    } else {
      const wordsArray = [];
      wordsApiArray.forEach((element) => {
        const {
          word,
          audio,
          wordTranslate,
        } = element;
        wordsArray.push({word, audio, wordTranslate});
      });
      this.wordsArray = wordsArray;

      const warning = !this.enoughWords;
      const regularDelay = 3000;
      const longDelay = 6000;
      const regularStartPoint = 3;
      const longStartPoint = 6;

      ContentBuilder.addGetReadyContent('.sprint__curtain', warning);
      this.curtainTimerStartPoint = this.enoughWords ? regularStartPoint : longStartPoint;
      this.gameDelay = this.enoughWords ? regularDelay : longDelay;

      this.gameIsActive = true;
      this.startTimer('.curtain__timer', this.curtainTimerStartPoint);
      setTimeout(() => {
        ContentBuilder.addMainPageContent(this.gameContainerSelector, this.gameLevel, this.gameRound);
        const switcherCheckbox = document.querySelector('.switch > input');
        const gameControls = document.querySelector('.sprint__game-controls');
        const levelSelector = document.querySelector('.game-controls__select_level');
        const roundSelector = document.querySelector('.game-controls__select_round');

        if (!this.soundIsEnabled) {
          const soundControlIcons = document.querySelectorAll('.sound-control__icon');
          soundControlIcons.forEach((soundIcon) => {
            soundIcon.classList.toggle('sound-control__icon_active');
          });
        }

        if (!this.isMyWords) {
          switcherCheckbox.removeAttribute('checked');
          gameControls.classList.remove('disabled');
          levelSelector.removeAttribute('disabled');
          roundSelector.removeAttribute('disabled');
        }
        this.startGame();
      }, this.gameDelay);
    }
  }

  startGame() {
    const sprintPanel = document.querySelector('.sprint__panel');
    this.board = document.querySelector('.sprint__board');
    const buttonTrue = this.board.querySelector('.board__button_true');
    const buttonFalse = this.board.querySelector('.board__button_false');
    const buttonRepeat = this.board.querySelector('.repeat-button__icon');
    const controlPanel = document.querySelector('.sprint__panel_right');
    const soundControlButtonOn = controlPanel.querySelector('.sound-control__icon_on');
    const soundControlButtonOff = controlPanel.querySelector('.sound-control__icon_off');
    const gameControls = controlPanel.querySelector('.sprint__game-controls');
    const reloadButton = controlPanel.querySelector('.game-controls__reload');
    const levelSelector = controlPanel.querySelector('.game-controls__select_level');
    const roundSelector = controlPanel.querySelector('.game-controls__select_round');
    const myWordsSwitch = controlPanel.querySelector('.slider');
    const wordAudio = this.setNewWord(this.wordsArray);
    this.wrongWords = [];
    this.correctWords = [];

    this.boardButtonsListener = (event) => {
      this.startBoardButtonsHandler(event, wordAudio, buttonTrue, buttonFalse, buttonRepeat);
    };

    this.keyboardListener = (event) => {
      this.startKeyboardHandler(event);
    };

    this.reloadButtonListener = async () => {
      if (!this.isMyWords) {
        this.gameLevel = levelSelector.value;
        this.gameRound = roundSelector.value;
        await UserSettingsMiniGame.updateUserSettingsMiniGame('sprint', this.gameLevel, this.gameRound);
      }
      this.currentRewardPoints = 10;
      this.currentStack = 0;
      clearTimeout(this.currentTimer);
      sprintPanel.innerHTML = `<div class="sprint__curtain curtain"></div>`;
      document.removeEventListener('keydown', this.keyboardListener);
      controlPanel.removeEventListener('click', this.levelRoundListener);
      this.launchGame();
    };

    this.soundControlButtonListener = (event) => {
      if (event.target === soundControlButtonOn || event.target === soundControlButtonOff) {
        this.soundIsEnabled = !this.soundIsEnabled;
        soundControlButtonOn.classList.toggle('sound-control__icon_active');
        soundControlButtonOff.classList.toggle('sound-control__icon_active');
      }
    }

    this.myWordsSwitchListener = () => {
      this.isMyWords = !this.isMyWords;
      gameControls.classList.toggle('disabled');
      if (!this.isMyWords) {
        levelSelector.removeAttribute('disabled');
        roundSelector.removeAttribute('disabled');
      } else {
        levelSelector.setAttribute('disabled', 'disabled');
        roundSelector.setAttribute('disabled', 'disabled');
      }
    }

    controlPanel.addEventListener('click', this.soundControlButtonListener);
    reloadButton.addEventListener('click', this.reloadButtonListener);
    myWordsSwitch.addEventListener('click', this.myWordsSwitchListener);
    document.addEventListener('keydown', this.keyboardListener);

    this.startTimer('.sprint__timer', this.gameTimerStartPoint);
    if (this.soundIsEnabled) wordAudio.play();
    this.board.addEventListener('click', this.boardButtonsListener);

    this.currentTimer = setTimeout(() => {
      this.endGame(this.boardButtonsListener, this.keyboardListener);
    }, this.gameDuration);
  }

  correctButtonPress() {
    if (this.isRandom) {
      if (this.soundIsEnabled) this.audioWrong.play();
      this.highlightElement(this.board, this.highlightClassWrong);
      this.wrongWords.push(this.currentWord);
      this.gameProgressHandler(false);
    } else {
      if (this.soundIsEnabled) this.audioCorrect.play();
      this.highlightElement(this.board, this.highlightClassCorrect);
      this.correctWords.push(this.currentWord);
      this.gameProgressHandler(true);
    }
  }

  wrongButtonPress() {
    if (this.isRandom) {
      if (this.soundIsEnabled) this.audioCorrect.play();
      this.highlightElement(this.board, this.highlightClassCorrect);
      this.correctWords.push(this.currentWord);
      this.gameProgressHandler(true);
    } else {
      if (this.soundIsEnabled) this.audioWrong.play();
      this.highlightElement(this.board, this.highlightClassWrong);
      this.wrongWords.push(this.currentWord);
      this.gameProgressHandler(false);
    }
  }

  highlightElement(element, highlightClass) {
    element.classList.add(highlightClass);
    setTimeout(() => {
      element.classList.remove(highlightClass);
    }, this.highlightDuration);
  }

  startKeyboardHandler(event) {
    this.counter = document.querySelector('.counter__value');
    this.stack = document.querySelector('.stack');
    this.reward = document.querySelector('.board__body_reward');
    let wordAudio;
    const playNewWord = () => {
      if (this.wordsArray.length) {
        wordAudio = this.setNewWord(this.wordsArray);
        if (this.soundIsEnabled) wordAudio.play();
      } else {
        this.endGame(this.boardButtonsListener, this.keyboardListener);
        clearTimeout(this.currentTimer);
      }
    };
    switch (event.code) {
      case 'ArrowLeft':
        this.correctButtonPress();
        playNewWord();
        break;
      case 'ArrowRight':
        this.wrongButtonPress();
        playNewWord();
        break;
      default:
        break;
    }
    return this;
  }

  async endGame(boardButtonsListener, keyboardListener) {
    if (this.soundIsEnabled) this.gameEnd.play();
    const score = document.querySelector('.counter__value');
    const board = document.querySelector('.sprint__board');
    this.gameIsActive = false;
    this.score = score.textContent;
    board.removeEventListener('click', boardButtonsListener);
    document.removeEventListener('keydown', keyboardListener);
    ContentBuilder.showCurrentGameStatistics('.sprint__panel_main', this.getStatisticsElement());
    StatisticsAPI.miniGameStat('sprint', this.score);
    await UserSettingsMiniGame.updateUserSettingsMiniGame('sprint', this.gameLevel, this.gameRound);
    const gameStatistics = document.querySelector('.game-statistics__popup');
    const gameStatisticsExit = gameStatistics.querySelector('.game-statistics__button_exit');
    gameStatistics.addEventListener('click', (event) => {
      switch (event.target) {
        case gameStatisticsExit:
          gameStatistics.remove();
          break;
        default:
          if (event.target.classList.contains('game-statistics__list-item_icon') && this.soundIsEnabled) {
            const wordAudio = `${this.filesUrlPrefix}${event.target.getAttribute('data-sound')}`;
            const audioElement = new Audio(wordAudio);
            audioElement.play();
          }
          break;
      }
    });
  }

  startBoardButtonsHandler(event, currentWordAudio, buttonTrue, buttonFalse, buttonRepeat) {
    this.counter = document.querySelector('.counter__value');
    this.stack = document.querySelector('.stack');
    this.reward = document.querySelector('.board__body_reward');
    let wordAudio = currentWordAudio;

    const playNewWord = () => {
      if (this.wordsArray.length) {
        wordAudio = this.setNewWord(this.wordsArray);
        if (this.soundIsEnabled) wordAudio.play();
      } else {
        this.endGame(this.boardButtonsListener, this.keyboardListener);
      }
    };
    switch (event.target) {
      case buttonTrue:
        this.correctButtonPress();
        playNewWord();
        break;
      case buttonFalse:
        this.wrongButtonPress();
        playNewWord();
        break;
      case buttonRepeat:
        if (this.soundIsEnabled) this.currentWordAudio.play();
        break;
      default:
        break;
    }
  }

  setNewWord(wordsArray) {
    const randomIndex = Sprint.getRandomInteger(wordsArray.length - 1);
    const currentWord = wordsArray[randomIndex];
    const currentWordTranslate = currentWord.wordTranslate;

    const randomWordTranslate = wordsArray[Sprint.getRandomInteger(wordsArray.length - 1)].wordTranslate;
    const isRandom = Math.round(Math.random());
    this.isRandom = isRandom;

    wordsArray.splice(randomIndex, 1);
    this.wordsArray = wordsArray;

    const board = document.querySelector('.sprint__board');
    const wordFieldForeign = board.querySelector('.board__body_foreign-word');
    const wordFieldTranslated = board.querySelector('.board__body_translated-word');

    wordFieldForeign.textContent = currentWord.word;
    wordFieldTranslated.textContent = isRandom ? randomWordTranslate : currentWordTranslate;

    const audioElement = new Audio(`${this.filesUrlPrefix}${currentWord.audio}`);
    this.currentWord = currentWord;
    this.currentWordAudio = audioElement;
    return audioElement;
  }

  static getRandomInteger(max) {
    return Math.round(-0.5 + Math.random() * (max + 1));
  }

  startTimer(timerSelector, startPoint) {
    const timer = document.querySelector(timerSelector);
    let timerValue = startPoint;
    timer.textContent = timerValue;
    const interval = setInterval(() => {
      timerValue -= 1;
      if (timerValue === -1 || !this.gameIsActive) {
        clearInterval(interval);
      } else {
        timer.textContent = timerValue;
      }
    }, 1000);
    return this;
  }

  increaseScore(counterElement) {
    const counter = counterElement;
    const currentValue = counter.textContent;
    counter.textContent = Number(currentValue) + Number(this.currentRewardPoints);
  }

  increaseStack() {
    if (this.currentStack < this.maxStack) {
      this.currentStack += 1;
      this.increaseScore(this.counter);
      this.stack.querySelector(`.stack__element_${this.currentStack}`).classList.add('stack__element_active');
    } else if(this.currentStack === this.maxStack && this.currentRewardPoints < this.maxRewardPoints) {
      this.currentStack = 0;
      this.currentRewardPoints *= 2;
      this.reward.textContent = `+${this.currentRewardPoints}`;
      this.highlightElement(this.reward, this.highlightClassCorrect);
      this.stack.querySelectorAll('.stack__element').forEach((element) => {
        element.classList.remove('stack__element_active');
      });
    }
  }

  resetStack() {
    if (this.currentRewardPoints > 10) this.highlightElement(this.reward, this.highlightClassWrong);
    this.currentRewardPoints = 10;
    this.currentStack = 0;
    this.reward.textContent = `+${this.currentRewardPoints}`;
    this.stack.querySelectorAll('.stack__element').forEach((element) => {
      element.classList.remove('stack__element_active');
    });
  }

  gameProgressHandler(answerIsCorrect) {
    if (answerIsCorrect) {
      this.increaseStack();
    } else {
      this.resetStack();
    }
  }

  static getWordsList(wordsArray) {
    const wordsList = document.createElement('ul');
    wordsArray.forEach((word) => {
      const element = document.createElement('li');
      element.classList.add('game-statistics__list-item');
      element.innerHTML = `
        <i class="fa fa-play game-statistics__list-item_icon" data-sound="${word.audio}"></i>${word.word} - ${word.wordTranslate}
      `;
      wordsList.append(element);
    });
    return wordsList;
  }

  getStatisticsElement() {
    const errorsAmount = this.wrongWords.length;
    const correctAnswersAmount = this.correctWords.length;
    const statisticsPopup = document.createElement('div');
    statisticsPopup.classList.add('game-statistics__popup');
    const errorsListItems = Sprint.getWordsList(this.wrongWords).innerHTML;
    const correctAnswersListItems = Sprint.getWordsList(this.correctWords).innerHTML;

    const statisticsMarkup = `
      <div class="game-statistics__header">
        <div class="game-statistics__score">
          ${this.score}
        </div>
      </div>
      <div class="game-statistics__main">
        <div class="game-statistics__errors">
          <button class="accordion">Ошибки<span class="game-statistics__errors_amount">${errorsAmount}</span><i class="fa fa-caret-down game-statistics__icon_caret-down"></i></button>
          <div class="accordion__panel">
            <ul class="game-statistics__list">
              ${errorsListItems}
            </ul>
          </div>
        </div>
        <span class="divider"></span>
        <div class="game-statistics__correct-answers">
          <button class="accordion">Угаданные слова<span class="game-statistics__correct-answers_amount">${correctAnswersAmount}</span><i class="fa fa-caret-down game-statistics__icon_caret-down"></i></button>
          <div class="accordion__panel">
            <ul class="game-statistics__list">
              ${correctAnswersListItems}
            </ul>
          </div>
        </div>
      </div>
      <div class="game-statistics__footer">
        <button class="button game-statistics__button_exit">
          Закрыть
        </button>
      </div>
    `;
    statisticsPopup.innerHTML = statisticsMarkup;
    return statisticsPopup;
  }

}

export default new Sprint();

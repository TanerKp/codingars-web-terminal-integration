import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

export class TerminalService {
  constructor(url, { task, target, language }) {
    console.log("create terminal service", url, task, target, language);

    this.url = url;
    this.socket = null;
    this.term = null;
    this.fitAddon = null;
    this.resizeObserver = null;

    this.inputBuffer = "";
    this.cursorPos = 0;
    this.history = [];
    this.historyIndex = -1;
    this.prompt = "\x1b[36m> \x1b[0m";

    this._init(target);
    this._connectWebSocket();
  }

  _init(target) {
    this.term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 1000,
      theme: {
        background: "#1D1D1D",
        foreground: "#f1f1f1",
      },
    });

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(target);
    this.term.focus();
    this.fitAddon.fit();

    window.addEventListener("resize", this._handleResize.bind(this));
    this._observeTerminal(target);

    this._showPrompt();
    this.term.onData(this._handleInput.bind(this));
  }

  _connectWebSocket() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        return resolve();
      }

      const wsUrl = this.url.replace(/^http/, "ws") + "/ws/run";
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        resolve();
      };

      this.socket.onerror = (err) => {
        reject(err);
      };

      this.socket.onmessage = (event) => {
        this._handleMessage(event);
      };
    });
  }

  _closeWebSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  _observeTerminal(target) {
    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
    });
    this.resizeObserver.observe(target);
  }

  _handleResize() {
    if (this.fitAddon) {
      this.fitAddon.fit();
    }
  }

  _showPrompt() {
    this.term.write(`\r\n${this.prompt}`);
    this.cursorPos = 0;
    this.inputBuffer = "";
  }

  _clearPromptLine() {
    this.term.write("\x1b[2K\r");
    this.inputBuffer = "";
    this.cursorPos = 0;
  }

  _handleInput(data) {
    switch (data) {
      case "\r": // ENTER
        if (this.inputBuffer.trim() === "") {
          return;
        }
        this.term.write("\r\n");
        this._sendInput(this.inputBuffer + "\n");

        if (this.inputBuffer.trim()) {
          this.history.unshift(this.inputBuffer);
        }
        this.historyIndex = -1;
        this.inputBuffer = "";
        this.cursorPos = 0;
        break;

      case "\u0003": // STRG + C
        this.term.write("^C");
        this.inputBuffer = "";
        this.cursorPos = 0;
        this._showPrompt();
        break;

      case "\u007f": // BACKSPACE
        if (this.cursorPos > 0) {
          this.inputBuffer =
            this.inputBuffer.slice(0, this.cursorPos - 1) +
            this.inputBuffer.slice(this.cursorPos);
          this.cursorPos--;
          this._redrawInput();
        }
        break;

      case "\u001b[A": // UP
        if (
          this.history.length > 0 &&
          this.historyIndex < this.history.length - 1
        ) {
          this.historyIndex++;
          this._replaceInput(this.history[this.historyIndex]);
        }
        break;

      case "\u001b[B": // DOWN
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this._replaceInput(this.history[this.historyIndex]);
        } else {
          this.historyIndex = -1;
          this._replaceInput("");
        }
        break;

      case "\u001b[D": // LEFT
        if (this.cursorPos > 0) {
          this.term.write("\x1b[D");
          this.cursorPos--;
        }
        break;

      case "\u001b[C": // RIGHT
        if (this.cursorPos < this.inputBuffer.length) {
          this.term.write("\x1b[C");
          this.cursorPos++;
        }
        break;

      default:
        if (data >= " ") {
          this.inputBuffer =
            this.inputBuffer.slice(0, this.cursorPos) +
            data +
            this.inputBuffer.slice(this.cursorPos);
          this.cursorPos++;
          this._redrawInput();
        }
        break;
    }
  }

  _redrawInput() {
    this.term.write("\x1b[2K\r" + this.prompt + this.inputBuffer);
    const absoluteCursor =
      this.prompt.replace(/\x1b\[[0-9;]*m/g, "").length + this.cursorPos;
    this.term.write("\x1b[" + (absoluteCursor + 1) + "G");
  }

  _replaceInput(newInput) {
    this.inputBuffer = newInput;
    this.cursorPos = newInput.length;
    this._redrawInput();
  }

  _handleMessage(event) {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "output/run":
          this.term.write(msg.data.replace(/\n/g, "\r\n"));
          this._showPrompt();
          break;
        case "output/error":
          this._clearPromptLine();
          this.term.write(`\x1b[31m${msg.error.replace(/\n/g, "\r\n")}\x1b[0m`);
          this._showPrompt();
          break;
      }

      this.term.scrollToBottom();
    } catch (err) {
      this._clearPromptLine();
      this.term.write(
        "\r\n\x1b[31mFehler beim Parsen der Nachricht\x1b[0m\r\n"
      );
      this._showPrompt();
    }
  }

  _sendInput(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "execute/shell", stdin: data }));
    }
  }

  clearTerminal() {
    if (this.term) {
      this.term.clear();
      this.term.reset();
    }
  }

  dispose() {
    this._closeWebSocket();
    if (this.term) {
      this.term.dispose();
      this.term = null;
      this.fitAddon.dispose();
      this.fitAddon = null;
    }
    window.removeEventListener("resize", this._handleResize.bind(this));
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
import Screen from './layout/Screen.js';
import ScreenRenderer from './renderers/ScreenRenderer.js';

class CLIMatic {
    constructor() {
        this.windows = [];
        this.screen = new Screen();
        this.screenRenderer = new ScreenRenderer(this.screen);
        this.screen.setScreenRenderer(this.screenRenderer);
    }

    getWindow(index = 0) {
        if (this.windows.length === 0) {
            throw new Error('No windows found');
        }

        return this.windows[index];
    }

    getScreen() {
        return this.screen;
    }

    getScreenRenderer() {
        return this.screenRenderer;
    }

    addWindow(window) {
        this.windows.push(window);
    }

    getWindows() {
        return this.windows;
    }

    start() {
        this.screenRenderer.start();
    }
}

export default CLIMatic;
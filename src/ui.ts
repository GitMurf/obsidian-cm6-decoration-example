import { App, Modal, SuggestModal } from 'obsidian';

export class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class OptionsModal extends SuggestModal<string> {
    options: string[] = [];
    selectedItem: string = "";

    constructor(app: App, private optionsArr: string[]) {
        super(app);
        this.emptyStateText = 'No matches found';
        this.options = this.optionsArr;
    }

    onOpen() {
        super.onOpen();
        this.lightenBackground();
    }

    getSuggestions(query: string): string[] {
        if (this.options) {
            return this.options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
        } else {
            this.close();
        }
        return [];
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.innerText = value;
    }

    onNoSuggestion(): void {
        this.resultContainerEl.empty();
        super.onNoSuggestion();
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        this.onChooseSuggestion(value, evt);
    }

    onChooseSuggestion(item: string, _: MouseEvent | KeyboardEvent): void {
        this.selectedItem = item;
        this.close();
    }

    lightenBackground() {
        let modalBg: HTMLElement = this.containerEl.querySelector('.modal-bg') as HTMLElement;
        if (modalBg) {
            modalBg.style.backgroundColor = '#00000029';
        }
        this.modalEl.style.border = '4px solid #483699';
    }
}

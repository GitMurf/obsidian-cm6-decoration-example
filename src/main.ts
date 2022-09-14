import { Plugin, App, editorInfoField, TFile } from 'obsidian';
import { ViewPlugin, Decoration, DecorationSet, PluginValue, EditorView, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';
import { formatDate } from './helpers';
import { DEFAULT_SETTINGS } from './settings';
import { MyPluginSettings } from './types';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    pluginName: string = 'CM6 Decoration Example by Murf';
    editorExtension: Extension[] = [];

    async onload() {
        console.log(`Loading plugin: ${this.pluginName} at [${formatDate()}]`);

        await this.loadSettings();

        // This adds a settings tab so the user can configure various aspects of the plugin
        // this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // console.log('click', evt);
        });

        this.registerEditorExtension(this.editorExtension);

        this.app.workspace.onLayoutReady(() => {
            this.updateEditorExtension(suggestionsExtension(this.app));
        });
    }

    updateEditorExtension(extension: Extension) {
        console.log("updateEditorExtension");
        this.editorExtension.length = 0; // Empties the array
        this.editorExtension.push(extension);
        this.app.workspace.updateOptions();
    }

    onunload() {
        console.log(`Unloading plugin: ${this.pluginName} at [${formatDate()}]`);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

const SuggestionCandidateClass = 'cm-suggestion-candidate';

const suggestionsExtension = (app: App): ViewPlugin<PluginValue> => {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                console.log("Constructor TFile:", this.getTFileFromView(view));
                this.decorations = this.decorateView(view);
            }

            getTFileFromView(view: EditorView): TFile {
                // Get TFile from the current EditorView
                const myTFile = view.state.field(editorInfoField).file;
                return myTFile;
            }

            public update(update: ViewUpdate): void {
                if (update.docChanged || update.viewportChanged) {
                    this.delayedDecorateView(update.view);
                }
            }

            delayedDecorateView(view: EditorView) {
                this.decorations = this.decorateView(view);
                /*
                    Need to setTimeout to allow for any synchronous updates to finish before we update the decorations manually
                        See here: https://discuss.codemirror.net/t/should-dispatched-transactions-be-added-to-a-queue/4610/5
                        This may be completely unnecessary to even do the view.update() here but the Sidekick plugin does it so I'm trying it
                */
                window.setTimeout(() => {
                    view.update([]);
                }, 10);
            }

            private decorateView(view: EditorView): DecorationSet {
                if (!view.hasFocus) {
                    console.log("This Editor does not have focus so skip...", view, view.hasFocus);
                    return Decoration.none;
                }
                const builder = new RangeSetBuilder<Decoration>();
                const keywordList = ['one', 'two', 'three', 'GitHub', 'Pull', 'Request decoration'];

                // Setup regex to match stuff you do NOT want highlighted
                // Page link square brackets (double or single)
                const regSqBrackets = "\\[[^\\]\\n]+?\\]";
                // Inline code backticks
                const regBackticks = "`[^`\\n]+?`";
                // Code block triple backticks
                const regTripleBackticks = "```[\\s\\S]+?```";
                // Hashtags
                const regHashtags = "#[^\\s#]+";
                // URL links
                const regURLLinks = "(?:https?://|www\\.)[^\\s]+";
                // Combine all the regex into one regexp
                const regExIgnore = new RegExp(`(${regSqBrackets}|${regBackticks}|${regTripleBackticks}|${regHashtags}|${regURLLinks})`, "gi");

                // Decorate visible ranges only (performance reasons)
                let visibleRanges = view.visibleRanges;
                /* COMMENTING OUT SINGLE LINE SCOPE FOR NOW
                    // This will only apply for the current active line but commenting out as it was removing everything else from every other line
                    // The preferred method would be that all highlights stay and then only the current line get re-computed (but I don't know if that is possible)
                const curPos = view.state.selection.ranges[0].from;
                const linesInView = view.viewportLineBlocks;
                const activeLine = linesInView.find((line) => line.from <= curPos && line.to >= curPos);
                visibleRanges = activeLine ? [{ from: activeLine.from, to: activeLine.to }] : visibleRanges;
                */
                for (const { from, to } of visibleRanges) {
                    console.log("TFile:", this.getTFileFromView(view));
                    console.log("Decorating visible range:", from, to, view, "focus:", view.hasFocus);
                    console.log("SELECTION:", view.state.selection);

                    const textToHighlight = view.state.sliceDoc(from, to);
                    console.log("textToHighlight:", textToHighlight);
                    const matchesToIgnore = textToHighlight.split(regExIgnore);
                    // console.log("matchesToIgnore", matchesToIgnore);
                    const matchesList = [];
                    let curPosition = 0;
                    for (const eachPart of matchesToIgnore) {
                        // console.log(`eachPart-${curPosition}:`, eachPart);
                        if (eachPart.match(regExIgnore)) {
                            // We do not want to match the ignored stuff
                        } else {
                            for (const keyword of keywordList) {
                                const keywordRegex = new RegExp(`${keyword}`, 'gi');
                                const findMatches = eachPart.match(keywordRegex);
                                if (findMatches) {
                                    let prevIndex = 0;
                                    for (const match of findMatches) {
                                        const start = eachPart.indexOf(match, prevIndex);
                                        const end = start + match.length;
                                        prevIndex = end;
                                        const decResult = {
                                            start: start + curPosition,
                                            end: end + curPosition,
                                            keyword: keyword,
                                            match: match
                                        }
                                        matchesList.push(decResult);
                                        console.log(decResult);
                                    }
                                }
                            }
                        }
                        curPosition += eachPart.length;
                    }

                    // sort matchesList by start position
                    matchesList.sort((a, b) => a.start - b.start);
                    // console.log('matchesList:', matchesList);
                    matchesList.forEach(eachDecMatch => {
                        console.log(eachDecMatch);
                        const start = eachDecMatch.start + from;
                        const end = eachDecMatch.end + from;
                        builder.add(start, end, underlineDecoration(start, end, eachDecMatch.keyword));
                    });
                }
                return builder.finish();
            }
        },
        {
            decorations: (view) => view.decorations,

            eventHandlers: {
                mousedown: (e: MouseEvent, view: EditorView) => {
                    const target = e.target as HTMLElement;
                    const isCandidate = target.classList.contains(SuggestionCandidateClass);

                    // Do nothing if user right-clicked or unrelated DOM element was clicked
                    if (!isCandidate || e.button !== 0) {
                        return;
                    }

                    // Extract position and replacement text from target element data attributes state
                    const { positionStart, positionEnd, indexKeyword } = target.dataset;
                    console.log('positionStart:', positionStart, 'positionEnd:', positionEnd, 'indexKeyword:', indexKeyword);

                    // On click can show the modal suggester for page link completion
                    view.dispatch({
                        changes: {
                            from: Number(positionStart),
                            to: Number(positionEnd),
                            insert: `[[${indexKeyword}]]`,
                        },
                    });
                },
            },
        }
    );
};

const underlineDecoration = (start: number, end: number, indexKeyword: string) => {
    return Decoration.mark({
        class: SuggestionCandidateClass,
        attributes: {
            'data-index-keyword': indexKeyword,
            'data-position-start': `${start}`,
            'data-position-end': `${end}`,
        },
    });
};

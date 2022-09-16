import { Plugin, editorInfoField, TFile, Editor } from 'obsidian';
import { ViewPlugin, Decoration, DecorationSet, PluginValue, EditorView, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';
import { formatDate } from './helpers';
import { DEFAULT_SETTINGS } from './settings';
import { MyPluginSettings } from './types';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    pluginName = 'CM6 Decoration Example by Murf';
    editorExtension: Extension[] = [];
    onFileOpen: TFile | null = null;

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
            console.log("onLayoutReady");
            this.updateEditorExtension(suggestionsExtension(this));
        });

        this.registerEvent(
            this.app.workspace.on('file-open', (fileObj) => {
                console.log("file-open:", fileObj);
                // This will save to the plugin object and allow for the CM6 extension to see if the file has just changed so it will run even though the document / viewport has not changed
                if(fileObj) this.onFileOpen = fileObj;
            })
        );

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                // Currently not doing anything with this yet but will monitor
                console.log("layout-change");
            })
        );
    }

    updateEditorExtension(extension: Extension) {
        // This should really only run once at startup / loading of the plugin
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

const suggestionsExtension = (plugin: MyPlugin): ViewPlugin<PluginValue> => {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            myPlugin: MyPlugin;

            constructor(view: EditorView) {
                console.log(`${plugin.pluginName} - CONSTRUCTOR - EditorView:`, view,'TFile:', this.getTFileFromView(view));
                this.myPlugin = plugin;
                this.decorations = this.decorateView(view);
            }

            public update(update: ViewUpdate): void {
                const thisFile = this.getTFileFromView(update.view);
                // console.log("public update():", thisFile);
                let fileOpenEvt = false;
                if (thisFile && this.myPlugin.onFileOpen && thisFile === this.myPlugin.onFileOpen) fileOpenEvt = true;
                this.myPlugin.onFileOpen = null;
                if (update.docChanged || update.viewportChanged || fileOpenEvt) {
                    this.decorations = this.decorateView(update.view);
                }
            }

            private decorateView(view: EditorView): DecorationSet {
                /* COMMENTING THIS OUT AS ACTUALLY DECORATIONS WILL NOT FIRE / UPDATE UNNECESSARILY UNLESS THE VIEWPORT CHANGES
                    // The only time this will run across all panes/leafs/views/notes at once is on initial load
                if (!view.hasFocus) {
                    console.log("This Editor does not have focus so skip...", view, view.hasFocus);
                    this.myPlugin.cm6LastEditorFocus = { file: this.getTFileFromView(view), focused: false };
                    return Decoration.none;
                }
                */
                /* DONT NEED THIS CODE RIGHT NOW BUT SAVING AS COULD COME IN HANDY FOR GETTING THE ACTIVE CM EDITOR
                const cmEditor = this.getCmEditorFromView(view);
                if (cmEditor) {
                    const getCursor = cmEditor.getCursor();
                    const getLine = cmEditor.getLine(getCursor.line);
                    // console.log("getCursor:", getCursor);
                    // console.log("getLine:", getLine);
                }
                */

                const builder = new RangeSetBuilder<Decoration>();
                const keywordList = ['need', 'GitHub', 'Pull', 'keep'];

                // Setup regex to match stuff you do NOT want highlighted
                // Code block triple backticks TODO: This is not finished yet with all corner cases (see info in Obsidian note)
                const regTripleBackticks = "^```[\\s\\S]+?(?:```|$)";
                const regTripleBackticks2 = "```[\\s\\S]+?```";
                // Page link square brackets (double or single)
                const regSqBrackets = "\\[[^\\]\\n]+?\\]";
                // Inline code backticks
                const regBackticks = "`[^`\\n]+?`";
                // Hashtags
                const regHashtags = "#[^\\s#]+";
                // URL links
                const regURLLinks = "(?:https?://|www\\.)[^\\s]+";
                // Combine all the regex into one regexp
                const regExIgnore = new RegExp(`(${regTripleBackticks}|${regTripleBackticks2}|${regSqBrackets}|${regBackticks}|${regHashtags}|${regURLLinks})`, "gi");

                // Decorate visible ranges only (performance reasons)
                const visibleRanges = view.visibleRanges;

                /* COMMENTING OUT SINGLE LINE SCOPE FOR NOW
                    // This will only apply for the current active line but commenting out as it was removing everything else from every other line
                    // The preferred method would be that all highlights stay and then only the current line get re-computed (but I don't know if that is possible)
                const curPos = view.state.selection.ranges[0].from;
                const linesInView = view.viewportLineBlocks;
                const activeLine = linesInView.find((line) => line.from <= curPos && line.to >= curPos);
                visibleRanges = activeLine ? [{ from: activeLine.from, to: activeLine.to }] : visibleRanges;
                */
                // console.log(`Full Doc:\n\n`, view.state.doc.toString());
                for (const { from, to } of visibleRanges) {
                    // console.log("TFile:", this.getTFileFromView(view));
                    // console.log("Decorating visible range:", from, to, view, "focus:", view.hasFocus);
                    // console.log("SELECTION:", view.state.selection);
                    const textToHighlight = view.state.sliceDoc(from, to);
                    // console.log("textToHighlight:", textToHighlight);
                    // console.log(`Visible Range: [${from} - ${to}]\n\n`, textToHighlight);
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
                        // console.log(eachDecMatch);
                        const start = eachDecMatch.start + from;
                        const end = eachDecMatch.end + from;
                        builder.add(start, end, underlineDecoration(start, end, eachDecMatch.keyword));
                    });
                }
                return builder.finish();
            }

            getTFileFromView(view: EditorView): TFile {
                // Get TFile from the current EditorView
                const myTFile = view.state.field(editorInfoField).file;
                return myTFile;
            }

            getCmEditorFromView(view: EditorView): Editor | null {
                // Get CM Editor object for grabbing things like cursor, line etc.
                const cmEditor = view.state.field(editorInfoField).editor;
                if (cmEditor) {
                    return cmEditor;
                } else {
                    return null;
                }
            }
        },
        {
            decorations: (view) => view.decorations,

            eventHandlers: {
                mousedown: (e: MouseEvent, view: EditorView) => {
                    // console.log("mousedown:", view);
                    const target = e.target as HTMLElement;
                    const isCandidate = target.classList.contains(SuggestionCandidateClass);

                    // Do nothing if user right-clicked or unrelated DOM element was clicked
                    if (!isCandidate || e.button !== 0) {
                        return;
                    }

                    e.preventDefault();
                    const cmEditor = view.state.field(editorInfoField).editor;
                    if (cmEditor) {
                        const getCursor = cmEditor.getCursor();
                        // const getLine = cmEditor.getLine(getCursor.line);
                        console.log("getCursor:", getCursor);
                        // console.log("getLine:", getLine);
                    }

                    // Extract position and replacement text from target element data attributes state
                    const { positionStart, positionEnd, indexKeyword } = target.dataset;
                    console.log('CLICK EVENT: positionStart:', positionStart, 'positionEnd:', positionEnd, 'indexKeyword:', indexKeyword);

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

import { Plugin, editorInfoField, TFile, Editor, App } from 'obsidian';
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
    unlinkFinder: UnlinkFinderLookup;

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
            this.unlinkFinder = new UnlinkFinderLookup(this);
            this.updateEditorExtension(suggestionsExtension(this));
        });

        this.registerEvent(
            this.app.workspace.on('file-open', (fileObj) => {
                console.log("file-open:", fileObj);
                // This will save to the plugin object and allow for the CM6 extension to see if the file has just changed so it will run even though the document / viewport has not changed
                if (fileObj) {
                    this.onFileOpen = fileObj;
                    this.unlinkFinder.updateLinkOptions();
                }
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
                // const visibleRanges = view.visibleRanges;
                // Licat suggested: Don't use visibleRanges use viewportLineBlocks
                const visibleLineBlocks = view.viewportLineBlocks;

                /* COMMENTING OUT SINGLE LINE SCOPE FOR NOW
                    // This will only apply for the current active line but commenting out as it was removing everything else from every other line
                    // The preferred method would be that all highlights stay and then only the current line get re-computed (but I don't know if that is possible)
                const curPos = view.state.selection.ranges[0].from;
                const linesInView = view.viewportLineBlocks;
                const activeLine = linesInView.find((line) => line.from <= curPos && line.to >= curPos);
                visibleRanges = activeLine ? [{ from: activeLine.from, to: activeLine.to }] : visibleRanges;
                */
                // const keywordList = ['need', 'GitHub', 'Pull', 'keep'];
                console.log(`Full Doc:\n\n`, view.state.doc.toString());
                console.log(visibleLineBlocks);
                const fullDocString = view.state.doc.toString().toLowerCase();
                const allMyPages = plugin.unlinkFinder.allLinkOptions;
                const keywordList = allMyPages.filter((page) => fullDocString.includes(page.name.toLowerCase()));
                console.log('keywordList:', keywordList);
                for (const { from, to } of visibleLineBlocks) {
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
                                const keywordStr = keyword.name;
                                const keywordRegex = new RegExp(`${keywordStr}`, 'gi');
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
                                            keyword: keywordStr,
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
                    /*
                    const cmEditor = view.state.field(editorInfoField).editor;
                    if (cmEditor) {
                        const getCursor = cmEditor.getCursor();
                        // const getLine = cmEditor.getLine(getCursor.line);
                        console.log("getCursor:", getCursor);
                        // console.log("getLine:", getLine);
                    }
                    */

                    // Extract position and replacement text from target element data attributes state
                    const { positionStart, positionEnd, indexKeyword } = target.dataset;
                    console.log('CLICK EVENT: positionStart:', positionStart, 'positionEnd:', positionEnd, 'indexKeyword:', indexKeyword);

                    if (indexKeyword) {
                        plugin.unlinkFinder.pageLookup(indexKeyword);
                        const myMatches = plugin.unlinkFinder.getRecentMatches();
                        console.log('myMatches:', myMatches);

                        // On click can show the modal suggester for page link completion
                        view.dispatch({
                            changes: {
                                from: Number(positionStart),
                                to: Number(positionEnd),
                                insert: `[[${myMatches[0].name}]]`,
                            },
                        });
                    }
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
            'title': indexKeyword,
        },
    });
};

class UnlinkFinderLookup {
    plugin: MyPlugin;
    allLinkOptions: { name: string; path: string }[];
    allLinkMatches: { name: string; path: string }[];

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
        this.updateLinkOptions();
    }

    updateLinkOptions() {
        this.allLinkOptions = this.getLinkOptions(this.plugin.app);
        console.log("UnlinkFinder updateLinkOptions:", this.allLinkOptions.length);
    }

    getLinkOptions(app: App) {
        const files = app.vault.getMarkdownFiles();
        const links: { name: string; path: string }[] = [];
        files.forEach((file: TFile) => {
            links.push({ name: file.basename, path: file.path });
        });
        const unresolvedLinkUniq: string[] = [];
        const unResLinks: { [key: string]: number }[] = Object.values(Object.fromEntries(Object.entries(app.metadataCache.unresolvedLinks)));
        unResLinks.forEach((eachItem) => {
            const theValues = Object.keys(eachItem);
            if (theValues.length > 0) {
                theValues.forEach(eachLink => {
                    if (!unresolvedLinkUniq.includes(eachLink)) {
                        unresolvedLinkUniq.push(eachLink);
                        links.push({ name: eachLink, path: "Unresolved" });
                    } else {
                        // console.log("already exists");
                    }
                })
            }
        });
        // let uniq: { name: string; path: string }[] = Array.from(new Set(links));
        return links;
    }

    mapLinkOptions() {
        // create new Map
        const linkOptionsMap = new Map<string, never>();
        // loop through all link options
        this.allLinkOptions.forEach((eachLinkObj) => {
            // loop through each word in the link name (split by space, dash, underscore, period)
            eachLinkObj.name.split(/[\s\-_.,]/).forEach((eachWord) => {
                // process and normalize the word by removing plurals, ing, ed, etc.
                const normalizedWord = this.normalizeWord(eachWord);
                if (!normalizedWord) return;
                const mapValue = {
                    linkObj: eachLinkObj,
                    originalWord: eachWord,
                }
                const getMappedWord: Map<string, { linkObj: never, originalWord: string }> = linkOptionsMap.get(normalizedWord);
                // if the word is not already in the map, add it
                if (!getMappedWord) {
                    linkOptionsMap.set(normalizedWord, [mapValue]);
                } else {
                    // if the word is already in the map, add the link obj to the array
                    getMappedWord.push(eachLinkObj);
                }
            });
        });
    }

    normalizeWord(word: string) {
        // if the word is less than 3 characters, skip it
        if (word.trim().length < 3) return null;
        // if the word is on our ignored list, skip it
        if (this.ignoreWord(word.trim())) return null;
        // normalize the word by removing plurals, ing, ed, etc.
        const stemmedWord = this.stemWord(word);
        if (!stemmedWord) return null;
        return stemmedWord;
    }

    // normalize down to word stems for better matching
    stemWord(word: string) {
        let stemmedWord = word.trim().toLowerCase();
        // if the word is less than 3 characters return null
        if (stemmedWord.length < 3) return null;
        if (this.ignoreWord(stemmedWord)) return null;
        // remove plurals, ing, ed, es, er with regex
        stemmedWord = stemmedWord.replace(/(s|ing|ed|es|er)$/, "");
        // if stemmed word is less than 3 characters, return the original word
        if (stemmedWord.length < 3) return word.trim().toLowerCase();
    }

    // list of common words to ignore
    ignoreWord(word: string) {
        const ignoreListArray = ["and", "the", "are", "but", "you", "can", "had", "has", "was", "get", "did", "its", "let", "put", "she", "not", "too", "for", "out", "them", "they", "their", "there", "with", "from", "into"];
        if (ignoreListArray.includes(word)) return true;
        return false;
    }

    getRecentMatches() {
        return this.allLinkMatches;
    }

    pageLookup(val: string) {
        this.allLinkMatches = [];
        const matchString = val;
        if (matchString.trim().length > 1) {
            // console.log(matchString);
            this.findExact(matchString);
            this.findStart(matchString);
            this.findContains(matchString);
            this.findSpaces(matchString);
            this.findWildcard(matchString);
            this.findFuzzyWords(matchString);
            // this.findFuzzyCharacters(matchString);
            // let uniq: { name: string; path: string }[] = Array.from(new Set(this.allLinkMatches));
            const uniqueTracker: string[] = [];
            const uniq = this.allLinkMatches.filter((item) => {
                if (uniqueTracker.includes(item.path + item.name)) {
                    return false;
                } else {
                    uniqueTracker.push(item.path + item.name);
                    return true;
                }
            });
            // console.log(uniq);
            this.allLinkMatches = uniq;
            if (this.allLinkMatches.length > 0) {
                this.setOptions();
            }
        }
    }

    setOptions() {
        console.log("setOptions:", this.allLinkMatches.length);
        // this.allLinkMatches.forEach((eachMatch) => {
        //     this.addItemDiv(eachMatch);
        // });
    }

    findExact(val: string) {
        const valString = val.toLowerCase();
        const foundMatches = this.allLinkOptions.find(eachLink => eachLink.name.toLowerCase() === valString);
        if (foundMatches) this.allLinkMatches.push(foundMatches);
        // console.log(foundMatches);
    }

    findStart(val: string) {
        const valString = val.toLowerCase();
        const foundMatches = this.allLinkOptions.filter(eachLink => eachLink.name.toLowerCase().startsWith(valString));
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    findContains(val: string) {
        const valString = val.toLowerCase();
        const foundMatches = this.allLinkOptions.filter(eachLink => eachLink.name.toLowerCase().indexOf(valString) > -1);
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    findSpaces(val: string) {
        const valString = val.toLowerCase().replace(/[\s\-._]/g, "");
        const foundMatches = this.allLinkOptions.filter(eachLink => eachLink.name.toLowerCase().replace(/[\s\-._]/g, "").indexOf(valString) > -1);
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    findWildcard(val: string) {
        const valString = this.escapeRegExp(val.toLowerCase());
        const regExp = new RegExp(`${valString.replace(/\./g, "..*").replace(/\s+/g, ".*")}`, "i");
        // console.log(regExp);
        const foundMatches = this.allLinkOptions.filter(eachLink => eachLink.name.match(regExp));
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    findFuzzyWords(val: string) {
        const valString = val.toLowerCase();
        const splitWords = valString.split(" ");
        const foundMatches = this.allLinkOptions.filter(eachLink => {
            const eachLinkLower = eachLink.name.toLowerCase();
            let foundAllWords = true;
            splitWords.forEach(eachWord => {
                if (foundAllWords) {
                    if (eachLinkLower.indexOf(eachWord) < 0) {
                        foundAllWords = false;
                    }
                }
            })
            if (foundAllWords) {
                return true;
            } else {
                return false;
            }
        });
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    findFuzzyCharacters(val: string) {
        const valString = val.toLowerCase();
        let newRegexFuzzyStr = "";
        for (const char of valString) {
            if (char !== " ") {
                newRegexFuzzyStr += `${this.escapeRegExp(char)}.*`;
            }
        }
        const regExp = new RegExp(`${newRegexFuzzyStr}`, "i");
        // console.log(regExp);
        const foundMatches = this.allLinkOptions.filter(eachLink => eachLink.name.match(regExp));
        if (foundMatches) this.sortAndAdd(foundMatches);
    }

    sortAndAdd(foundMatches: { name: string; path: string }[]) {
        // sort by length as typically the shorter the word/phrase the more relevant to the user
        foundMatches.sort((a, b) => a.name.length - b.name.length);
        this.allLinkMatches.push(...foundMatches);
        // console.log(foundMatches);
    }

    escapeRegExp(text: string) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    }
}

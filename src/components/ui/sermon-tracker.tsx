import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowBigDownDash,
  Bookmark,
  BookOpen,
  CalendarCheck,
  Check,
  Church,
  CloudDownload,
  CloudUpload,
  FilePlus,
  Folder,
  FolderEdit,
  FolderPlus,
  Layers,
  Library,
  Mic2,
  Music4,
  NotebookPen,
  Palette,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SermonNote = {
  id: string;
  title: string;
  date: string;
  color: string;
  pastors: string[];
  notes: string;
  scriptures: ScriptureReference[];
};

type ScriptureReference = {
  id: string;
  reference: string;
  text: string;
  translation: string;
};

type FolderType = {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: IconName;
  sermons: SermonNote[];
};

type IconName = keyof typeof ICON_MAP;

type IconOption = {
  value: IconName;
  label: string;
};

const ICON_MAP = {
  folder: Folder,
  archive: Archive,
  library: Library,
  microphone: Mic2,
  notebook: NotebookPen,
  book: BookOpen,
  bookmark: Bookmark,
  church: Church,
  palette: Palette,
  music: Music4,
  layers: Layers,
} as const;

const ICON_OPTIONS: IconOption[] = [
  { value: "folder", label: "Pasta" },
  { value: "archive", label: "Arquivo" },
  { value: "library", label: "Biblioteca" },
  { value: "microphone", label: "Pregação" },
  { value: "notebook", label: "Anotações" },
  { value: "book", label: "Estudo" },
  { value: "bookmark", label: "Série" },
  { value: "church", label: "Ministério" },
  { value: "palette", label: "Criativo" },
  { value: "music", label: "Louvor" },
  { value: "layers", label: "Temas" },
];

const STORAGE_KEY = "sermon-tracker-data";
const STORAGE_TOKEN_KEY = "sermon-tracker-abbible-token";

const GLASS_CLASSES =
  "bg-slate-950/40 border border-white/10 backdrop-blur-2xl shadow-[0_18px_80px_rgba(15,23,42,0.45)]";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const DEFAULT_FOLDER: FolderType = {
  id: createId(),
  name: "Pregações Recentes",
  description: "Organize as últimas mensagens em um só lugar",
  color: "#38bdf8",
  icon: "microphone",
  sermons: [],
};

const DEFAULT_SERMON_TEMPLATE: SermonNote = {
  id: "",
  title: "Nova pregação",
  date: new Date().toISOString().split("T")[0],
  color: "#38bdf8",
  pastors: [],
  notes: "",
  scriptures: [],
};

const SAMPLE_VERSES: Record<string, string> = {
  "João 3:16":
    "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo o que nele crê não pereça, mas tenha a vida eterna.",
  "Salmos 23:1":
    "O SENHOR é o meu pastor; nada me faltará.",
  "Mateus 11:28":
    "Venham a mim todos os que estão cansados e sobrecarregados, e eu os aliviarei.",
};

const TRANSLATION_LABEL = "NAA";

const formatReference = (input: string) => input.trim().replace(/\s+/g, " ");

const sanitizeHtml = (content: string) => {
  const allowedTags = [
    "b",
    "strong",
    "i",
    "em",
    "u",
    "a",
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "span",
    "img",
    "h1",
    "h2",
    "h3",
    "blockquote",
  ];
  const temp = document.createElement("div");
  temp.innerHTML = content;
  temp.querySelectorAll("*").forEach((node) => {
    if (!allowedTags.includes(node.tagName.toLowerCase())) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    if (node instanceof HTMLAnchorElement) {
      node.rel = "noopener noreferrer";
      node.target = "_blank";
    }
    if (node instanceof HTMLImageElement) {
      node.loading = "lazy";
      node.decoding = "async";
      node.referrerPolicy = "no-referrer";
      node.classList.add("rounded-xl", "shadow-lg", "max-h-60");
    }
  });
  return temp.innerHTML;
};

const loadFromStorage = (): FolderType[] => {
  if (typeof window === "undefined") return [DEFAULT_FOLDER];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [DEFAULT_FOLDER];
  try {
    const parsed = JSON.parse(raw) as FolderType[];
    if (parsed.length === 0) {
      return [DEFAULT_FOLDER];
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse sermon tracker data", error);
    return [DEFAULT_FOLDER];
  }
};

const loadToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_TOKEN_KEY) ?? "";
};

const saveToStorage = (folders: FolderType[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
};

const saveToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
};

export function SermonTracker() {
  const [folders, setFolders] = useState<FolderType[]>(() => loadFromStorage());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    () => folders[0]?.id ?? null,
  );
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editingSermon, setEditingSermon] = useState<SermonNote | null>(null);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [abbibleToken, setAbbibleToken] = useState<string>(() => loadToken());
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveToStorage(folders);
  }, [folders]);

  useEffect(() => {
    if (!editingSermon) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = editingSermon.notes;
    }
  }, [editingSermon]);

  useEffect(() => {
    saveToken(abbibleToken);
  }, [abbibleToken]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((folder) => folder.id === selectedFolderId) ?? null;
  }, [folders, selectedFolderId]);

  const handleAddFolder = () => {
    const newFolder: FolderType = {
      id: createId(),
      name: "Nova pasta",
      description: "Personalize o nome, ícone e cor",
      color: "#38bdf8",
      icon: "folder",
      sermons: [],
    };
    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id);
    setEditingFolder(newFolder);
  };

  const handleFolderChange = (field: keyof FolderType, value: string) => {
    if (!editingFolder) return;
    setEditingFolder({ ...editingFolder, [field]: value } as FolderType);
  };

  const handleSaveFolder = () => {
    if (!editingFolder) return;
    setFolders((prev) =>
      prev.map((folder) => (folder.id === editingFolder.id ? editingFolder : folder)),
    );
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId((prev) => {
        const remaining = folders.filter((folder) => folder.id !== folderId);
        return remaining[0]?.id ?? null;
      });
    }
  };

  const startNewSermon = () => {
    const base: SermonNote = {
      ...DEFAULT_SERMON_TEMPLATE,
      id: createId(),
      date: new Date().toISOString().split("T")[0],
    };
    setEditingSermon(base);
  };

  const handleSermonField = <K extends keyof SermonNote>(
    field: K,
    value: SermonNote[K],
  ) => {
    if (!editingSermon) return;
    setEditingSermon({ ...editingSermon, [field]: value });
  };

  const updatePastors = (pastors: string[]) => {
    if (!editingSermon) return;
    setEditingSermon({ ...editingSermon, pastors });
  };

  const handleEditorInput = () => {
    if (!editorRef.current || !editingSermon) return;
    const sanitized = sanitizeHtml(editorRef.current.innerHTML);
    handleSermonField("notes", sanitized);
  };

  const applyEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const insertImage = () => {
    if (!editorRef.current) return;
    const url = window.prompt("Cole o link da imagem");
    if (!url) return;
    applyEditorCommand("insertImage", url);
  };

  const handleAIAssist = () => {
    if (!editorRef.current || !editingSermon) return;
    const current = editorRef.current.innerText.trim();
    const suggestion = generateAISuggestion(current);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = suggestion;
    editorRef.current.appendChild(wrapper);
    handleEditorInput();
  };

  const handleSaveSermon = () => {
    if (!editingSermon || !selectedFolder) return;
    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.id !== selectedFolder.id) return folder;
        const exists = folder.sermons.some((sermon) => sermon.id === editingSermon.id);
        const sermons = exists
          ? folder.sermons.map((sermon) =>
              sermon.id === editingSermon.id ? editingSermon : sermon,
            )
          : [...folder.sermons, editingSermon];
        return { ...folder, sermons };
      }),
    );
    setEditingSermon(null);
  };

  const handleEditSermon = (sermon: SermonNote) => {
    setEditingSermon({ ...sermon });
  };

  const handleDeleteSermon = (sermonId: string) => {
    if (!selectedFolder) return;
    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.id !== selectedFolder.id) return folder;
        return {
          ...folder,
          sermons: folder.sermons.filter((sermon) => sermon.id !== sermonId),
        };
      }),
    );
  };

  const handleAddPastor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSermon) return;
    const form = event.currentTarget;
    const input = new FormData(form).get("pastor");
    const value = typeof input === "string" ? input.trim() : "";
    if (!value) return;
    updatePastors([...new Set([...editingSermon.pastors, value])]);
    form.reset();
  };

  const handleRemovePastor = (pastor: string) => {
    if (!editingSermon) return;
    updatePastors(editingSermon.pastors.filter((item) => item !== pastor));
  };

  const handleAddScripture = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSermon) return;
    const form = event.currentTarget;
    const value = formatReference(String(new FormData(form).get("reference") ?? ""));
    if (!value) return;

    setScriptureLoading(true);
    try {
      const passage = await fetchNAAPassage(value, abbibleToken);
      const scripture: ScriptureReference = {
        id: createId(),
        reference: value,
        text: passage,
        translation: TRANSLATION_LABEL,
      };
      handleSermonField("scriptures", [...editingSermon.scriptures, scripture]);
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível localizar o texto bíblico automaticamente. Verifique a referência ou configure o token da A Bíblia Digital.",
      );
    } finally {
      setScriptureLoading(false);
    }
    form.reset();
  };

  const handleRemoveScripture = (id: string) => {
    if (!editingSermon) return;
    handleSermonField(
      "scriptures",
      editingSermon.scriptures.filter((item) => item.id !== id),
    );
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(folders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pregacoes-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FolderType[];
      setFolders(parsed);
      setSelectedFolderId(parsed[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível importar o arquivo selecionado.");
    }
  };

  return (
    <div className="relative flex min-h-[90vh] flex-col gap-6 pb-16 text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute -top-32 left-1/2 h-96 w-[38rem] -translate-x-1/2 rounded-full bg-sky-400/20 blur-[180px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

      <header className={cn("mt-20 grid gap-4 lg:grid-cols-[1fr_auto]", GLASS_CLASSES, "rounded-3xl p-8")}> 
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300/70">Liquid Glass Collection</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50 md:text-4xl">
            Diario de Pregações
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300">
            Organize séries, cultos e mensagens com o visual Liquid Glass da Apple. Crie pastas personalizadas, documente pregadores, datas, textos bíblicos e escreva suas anotações com ferramentas avançadas.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5 text-sm text-slate-200">
          <div className="flex items-center gap-2">
            <CloudUpload className="size-5 text-sky-300" />
            <span>Importar backup</span>
          </div>
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="text-xs text-slate-400"
          />
          <button
            onClick={handleExport}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/30"
          >
            <CloudDownload className="size-4" /> Exportar tudo
          </button>
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Token A Bíblia Digital (opcional)
            </label>
            <input
              value={abbibleToken}
              onChange={(event) => setAbbibleToken(event.target.value)}
              placeholder="Cole aqui para obter textos na NAA"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            />
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[320px,1fr]">
        <aside className={cn("flex flex-col gap-4 rounded-3xl p-6", GLASS_CLASSES)}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Pastas</h2>
            <button
              onClick={handleAddFolder}
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-1 text-sm font-medium text-slate-100 transition hover:bg-white/20"
            >
              <FolderPlus className="size-4" />
              Nova
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {folders.map((folder) => {
              const Icon = ICON_MAP[folder.icon];
              const isActive = folder.id === selectedFolderId;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition",
                    isActive ? "bg-white/15" : "bg-white/5 hover:bg-white/10",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-2xl"
                      style={{ background: `${folder.color}33`, color: folder.color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{folder.name}</p>
                      {folder.description ? (
                        <p className="text-xs text-slate-300/80">{folder.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs">{folder.sermons.length}</span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingFolder(folder);
                      }}
                      className="rounded-xl bg-white/10 p-1 hover:bg-white/20"
                      title="Editar pasta"
                    >
                      <FolderEdit className="size-3.5" />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (confirm("Remover esta pasta?")) {
                          handleDeleteFolder(folder.id);
                        }
                      }}
                      className="rounded-xl bg-white/10 p-1 hover:bg-red-500/30"
                      title="Remover pasta"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col gap-6">
          {selectedFolder ? (
            <div className={cn("rounded-3xl p-6", GLASS_CLASSES)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">
                    {selectedFolder.name}
                  </h2>
                  <p className="text-sm text-slate-300/80">
                    {selectedFolder.description ?? "Todas as suas anotações organizadas."}
                  </p>
                </div>
                <button
                  onClick={startNewSermon}
                  className="flex items-center gap-2 rounded-2xl bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/30"
                >
                  <FilePlus className="size-4" /> Nova pregação
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectedFolder.sermons.map((sermon) => (
                  <article
                    key={sermon.id}
                    className="group flex flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-200 transition hover:border-sky-400/40 hover:bg-white/10"
                    style={{ boxShadow: `0 18px 42px -24px ${sermon.color}66` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          {new Date(sermon.date).toLocaleDateString("pt-BR")}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-50">
                          {sermon.title}
                        </h3>
                      </div>
                      <div
                        className="size-10 shrink-0 rounded-2xl border border-white/20"
                        style={{ background: `${sermon.color}22`, borderColor: `${sermon.color}55` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-300/80">
                      <p className="font-medium text-slate-200">
                        Pastores: {sermon.pastors.join(", ") || "Adicionar"}
                      </p>
                      <p className="mt-1 line-clamp-3 text-slate-400">
                        {stripHtml(sermon.notes) || "Escreva anotações inspiradoras."}
                      </p>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{sermon.scriptures.length} textos bíblicos</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSermon(sermon)}
                          className="rounded-xl bg-white/10 px-3 py-1 font-medium text-slate-200 transition hover:bg-white/20"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => handleDeleteSermon(sermon.id)}
                          className="rounded-xl bg-red-500/20 px-3 py-1 font-medium text-red-200 transition hover:bg-red-500/30"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {selectedFolder.sermons.length === 0 ? (
                  <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-300">
                    <p className="text-sm">
                      Nenhuma pregação cadastrada. Clique em <strong>Nova pregação</strong> para começar.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={cn("rounded-3xl p-10 text-center", GLASS_CLASSES)}>
              <p className="text-lg text-slate-300">
                Crie ou selecione uma pasta para visualizar as suas mensagens.
              </p>
            </div>
          )}

          {editingSermon ? (
            <div className={cn("rounded-3xl p-6", GLASS_CLASSES)}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                    Editor de Pregação
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-50">
                    {editingSermon.title}
                  </h3>
                </div>
                <button
                  onClick={handleSaveSermon}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-400/30 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/40"
                >
                  <Check className="size-4" /> Salvar pregação
                </button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px),1fr]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Título da mensagem
                    </label>
                    <input
                      value={editingSermon.title}
                      onChange={(event) => handleSermonField("title", event.target.value)}
                      placeholder="Ex: O Deus que nos chama"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                          Data
                        </label>
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <CalendarCheck className="size-4 text-slate-400" />
                          <input
                            type="date"
                            value={editingSermon.date}
                            onChange={(event) => handleSermonField("date", event.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                          Cor da pregação
                        </label>
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <Palette className="size-4 text-slate-400" />
                          <input
                            type="color"
                            value={editingSermon.color}
                            onChange={(event) => handleSermonField("color", event.target.value)}
                            className="h-9 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent"
                          />
                          <span className="text-xs text-slate-300">
                            {editingSermon.color.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Pastores
                    </label>
                    <form onSubmit={handleAddPastor} className="mt-3 flex gap-2">
                      <input
                        name="pastor"
                        placeholder="Adicionar pastor(a)"
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20"
                      >
                        <Plus className="size-4" />
                      </button>
                    </form>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editingSermon.pastors.map((pastor) => (
                        <span
                          key={pastor}
                          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-100"
                        >
                          {pastor}
                          <button
                            onClick={() => handleRemovePastor(pastor)}
                            className="rounded-full bg-white/10 p-1 text-slate-300 transition group-hover:bg-red-500/40 group-hover:text-red-50"
                            title="Remover"
                            type="button"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      ))}
                      {editingSermon.pastors.length === 0 ? (
                        <span className="text-xs text-slate-400">
                          Nenhum pastor adicionado ainda.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Textos bíblicos (NAA)
                        </p>
                        <p className="text-xs text-slate-400">
                          Adicione uma referência para carregar o texto automaticamente.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleAddScripture} className="mt-4 flex gap-2">
                      <input
                        name="reference"
                        placeholder="Ex: João 3:16"
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      />
                      <button
                        type="submit"
                        disabled={scriptureLoading}
                        className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/30 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400"
                      >
                        {scriptureLoading ? "Carregando..." : "Adicionar"}
                      </button>
                    </form>
                    <div className="mt-4 space-y-3">
                      {editingSermon.scriptures.map((scripture) => (
                        <div
                          key={scripture.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-100">{scripture.reference}</p>
                              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
                                {scripture.translation}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveScripture(scripture.id)}
                              className="rounded-xl bg-red-500/20 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-500/30"
                            >
                              Remover
                            </button>
                          </div>
                          <p className="mt-2 text-slate-300">{scripture.text}</p>
                        </div>
                      ))}
                      {editingSermon.scriptures.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Sem textos adicionados. Pesquise por referências como "João 3:16" ou "Salmos 23:1-3".
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
                        Anotações
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => applyEditorCommand("bold")}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Negrito
                        </button>
                        <button
                          onClick={() => applyEditorCommand("italic")}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Itálico
                        </button>
                        <button
                          onClick={() => applyEditorCommand("underline")}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Sublinhado
                        </button>
                        <button
                          onClick={() => applyEditorCommand("insertUnorderedList")}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Bullet points
                        </button>
                        <button
                          onClick={insertImage}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Adicionar imagem
                        </button>
                        <button
                          onClick={() => {
                            const color = prompt("Digite uma cor hexadecimal (ex: #f97316)");
                            if (color) applyEditorCommand("foreColor", color);
                          }}
                          className="rounded-xl bg-white/10 px-3 py-1 text-slate-100 transition hover:bg-white/20"
                          type="button"
                        >
                          Colorir texto
                        </button>
                        <button
                          onClick={handleAIAssist}
                          className="flex items-center gap-1 rounded-xl bg-sky-400/20 px-3 py-1 text-sky-100 transition hover:bg-sky-400/30"
                          type="button"
                        >
                          <Sparkles className="size-3" /> Sugerir IA
                        </button>
                      </div>
                    </div>
                    <div
                      ref={editorRef}
                      className="min-h-[320px] rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-100 focus:outline-none"
                      contentEditable
                      onInput={handleEditorInput}
                      suppressContentEditableWarning
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {editingFolder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Personalizar pasta</h3>
              <button onClick={() => setEditingFolder(null)} className="rounded-full bg-white/10 p-2">
                <ArrowBigDownDash className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Nome da pasta
                </label>
                <input
                  value={editingFolder.name}
                  onChange={(event) => handleFolderChange("name", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Descrição
                </label>
                <textarea
                  value={editingFolder.description ?? ""}
                  onChange={(event) => handleFolderChange("description", event.target.value)}
                  rows={2}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                    Cor
                  </label>
                  <input
                    type="color"
                    value={editingFolder.color}
                    onChange={(event) => handleFolderChange("color", event.target.value)}
                    className="h-11 w-20 cursor-pointer rounded-xl border border-white/10 bg-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.28em] text-slate-400">
                    Ícone
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICON_OPTIONS.map((option) => {
                      const Icon = ICON_MAP[option.value];
                      const isActive = editingFolder.icon === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleFolderChange("icon", option.value)}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-200 transition",
                            isActive && "border-sky-400/60 bg-sky-400/10 text-sky-100",
                          )}
                          type="button"
                        >
                          <Icon className="size-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingFolder(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFolder}
                className="rounded-xl bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/30"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stripHtml(content: string) {
  if (typeof window === "undefined") return content;
  const temp = document.createElement("div");
  temp.innerHTML = content;
  return temp.textContent || temp.innerText || "";
}

function generateAISuggestion(existing: string) {
  const template = `
  <h3>Aplicação prática</h3>
  <ul>
    <li>Como responder ao desafio apresentado no texto?</li>
    <li>Quais passos concretos a igreja pode dar nesta semana?</li>
    <li>Ore concluindo, reforçando a dependência do Espírito Santo.</li>
  </ul>
  <p>Resumo poético para encerrar: <em>"${
    existing.slice(0, 80) || "O Senhor fala ao nosso coração"
  }"</em>.</p>
  `;
  return template;
}

async function fetchNAAPassage(reference: string, token?: string) {
  const normalized = reference
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "%20")
    .replace(/:/g, "%3A");

  const apiUrl = `https://www.abibliadigital.com.br/api/verses/naa/${normalized}`;

  try {
    const response = await fetch(apiUrl, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error("Resposta inválida");
    }

    const data = await response.json();
    if (data?.text) {
      return data.text as string;
    }
    if (Array.isArray(data?.verses)) {
      return data.verses.map((verse: { text: string }) => verse.text).join(" ");
    }
  } catch (error) {
    const fallback = SAMPLE_VERSES[reference];
    if (fallback) return fallback;
    const fallbackResponse = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=almeida`,
    );
    if (!fallbackResponse.ok) {
      throw error instanceof Error ? error : new Error("Erro ao buscar passagem");
    }
    const fallbackData = await fallbackResponse.json();
    if (fallbackData?.text) {
      return fallbackData.text as string;
    }
  }
  throw new Error("Não foi possível obter o texto bíblico");
}

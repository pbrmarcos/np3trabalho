import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
}

interface FAQContent {
  title: string;
  subtitle: string;
  questions: FAQQuestion[];
}

interface HomeFAQConfigFormProps {
  settings: Record<string, { id: string; value: any; description: string }> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

function SortableQuestion({
  item,
  onUpdate,
  onRemove,
}: {
  item: FAQQuestion;
  onUpdate: (id: string, field: "question" | "answer", value: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/50 border border-border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Pergunta</Label>
            <Input
              value={item.question}
              onChange={(e) => onUpdate(item.id, "question", e.target.value)}
              placeholder="Digite a pergunta..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Resposta</Label>
            <Textarea
              value={item.answer}
              onChange={(e) => onUpdate(item.id, "answer", e.target.value)}
              placeholder="Digite a resposta..."
              className="mt-1 min-h-[80px]"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const defaultContent: FAQContent = {
  title: "Da hospedagem de site ao registro de domínio",
  subtitle: "Tudo para seu projeto",
  questions: [],
};

export default function HomeFAQConfigForm({ settings, onSave, isSaving }: HomeFAQConfigFormProps) {
  const [content, setContent] = useState<FAQContent>(defaultContent);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (settings?.homepage_faq_content?.value) {
      setContent(settings.homepage_faq_content.value as FAQContent);
    }
  }, [settings]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setContent((prev) => {
        const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
        const newIndex = prev.questions.findIndex((q) => q.id === over.id);
        return {
          ...prev,
          questions: arrayMove(prev.questions, oldIndex, newIndex),
        };
      });
    }
  };

  const addQuestion = () => {
    const newQuestion: FAQQuestion = {
      id: Date.now().toString(),
      question: "",
      answer: "",
    };
    setContent((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  const updateQuestion = (id: string, field: "question" | "answer", value: string) => {
    setContent((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    }));
  };

  const removeQuestion = (id: string) => {
    setContent((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  const handleSave = () => {
    onSave("homepage_faq_content", content);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ da Página Inicial</CardTitle>
        <CardDescription>
          Configure as perguntas frequentes exibidas na página inicial (máximo 5 visíveis).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title & Subtitle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título da Seção</Label>
            <Input
              value={content.title}
              onChange={(e) => setContent((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Da hospedagem de site ao registro de domínio"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Input
              value={content.subtitle}
              onChange={(e) => setContent((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Ex: Tudo para seu projeto"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Perguntas ({content.questions.length})</Label>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {content.questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <p>Nenhuma pergunta cadastrada.</p>
              <Button type="button" variant="link" onClick={addQuestion}>
                Adicionar primeira pergunta
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={content.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {content.questions.map((item) => (
                    <SortableQuestion
                      key={item.id}
                      item={item}
                      onUpdate={updateQuestion}
                      onRemove={removeQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar FAQ da Home
        </Button>
      </CardContent>
    </Card>
  );
}

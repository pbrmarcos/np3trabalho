import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Loader2, HelpCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
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
  question: string;
  answer: string;
}

interface FAQCategory {
  name: string;
  questions: FAQQuestion[];
}

interface FAQContent {
  title: string;
  subtitle: string;
  categories: FAQCategory[];
}

interface FAQConfigFormProps {
  settings: Record<string, any> | undefined;
  onSave: (key: string, value: any) => void;
  isSaving: boolean;
}

interface SortableQuestionProps {
  id: string;
  question: FAQQuestion;
  qIndex: number;
  catIndex: number;
  totalQuestions: number;
  onQuestionChange: (catIndex: number, qIndex: number, field: 'question' | 'answer', value: string) => void;
  onRemove: (catIndex: number, qIndex: number) => void;
}

function SortableQuestion({ id, question, qIndex, catIndex, totalQuestions, onQuestionChange, onRemove }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">Pergunta {qIndex + 1}</span>
        </div>
        {totalQuestions > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(catIndex, qIndex)}
            className="h-6 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remover
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Pergunta</Label>
        <Input
          value={question.question}
          onChange={(e) => onQuestionChange(catIndex, qIndex, 'question', e.target.value)}
          placeholder="Digite a pergunta..."
        />
      </div>
      <div className="space-y-2">
        <Label>Resposta</Label>
        <Textarea
          value={question.answer}
          onChange={(e) => onQuestionChange(catIndex, qIndex, 'answer', e.target.value)}
          placeholder="Digite a resposta..."
          rows={4}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Use • para listas e quebras de linha para parágrafos.
        </p>
      </div>
    </div>
  );
}

interface SortableCategoryProps {
  id: string;
  category: FAQCategory;
  catIndex: number;
  onCategoryNameChange: (catIndex: number, name: string) => void;
  onRemoveCategory: (catIndex: number) => void;
  onQuestionChange: (catIndex: number, qIndex: number, field: 'question' | 'answer', value: string) => void;
  onRemoveQuestion: (catIndex: number, qIndex: number) => void;
  onAddQuestion: (catIndex: number) => void;
  onQuestionsReorder: (catIndex: number, oldIndex: number, newIndex: number) => void;
}

function SortableCategory({ 
  id, 
  category, 
  catIndex, 
  onCategoryNameChange, 
  onRemoveCategory,
  onQuestionChange,
  onRemoveQuestion,
  onAddQuestion,
  onQuestionsReorder,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const questionIds = category.questions.map((_, idx) => `question-${catIndex}-${idx}`);

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questionIds.indexOf(active.id as string);
      const newIndex = questionIds.indexOf(over.id as string);
      onQuestionsReorder(catIndex, oldIndex, newIndex);
    }
  };

  return (
    <AccordionItem ref={setNodeRef} style={style} value={`category-${catIndex}`} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="font-medium">{category.name}</span>
          <span className="text-xs text-muted-foreground">({category.questions.length} perguntas)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        {/* Category Name */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Nome da Categoria</Label>
            <Input
              value={category.name}
              onChange={(e) => onCategoryNameChange(catIndex, e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => onRemoveCategory(catIndex)}
            title="Remover categoria"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Questions */}
        <div className="space-y-4 pl-4 border-l-2 border-muted">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              {category.questions.map((q, qIndex) => (
                <SortableQuestion
                  key={`question-${catIndex}-${qIndex}`}
                  id={`question-${catIndex}-${qIndex}`}
                  question={q}
                  qIndex={qIndex}
                  catIndex={catIndex}
                  totalQuestions={category.questions.length}
                  onQuestionChange={onQuestionChange}
                  onRemove={onRemoveQuestion}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddQuestion(catIndex)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Pergunta
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function FAQConfigForm({ settings, onSave, isSaving }: FAQConfigFormProps) {
  const [faqContent, setFaqContent] = useState<FAQContent>({
    title: "Perguntas e Respostas",
    subtitle: "FAQ Completo – 10+ Perguntas",
    categories: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (settings?.faq_content?.value) {
      setFaqContent(settings.faq_content.value);
    }
  }, [settings]);

  const handleTitleChange = (field: 'title' | 'subtitle', value: string) => {
    setFaqContent(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryNameChange = (categoryIndex: number, name: string) => {
    setFaqContent(prev => {
      const newCategories = [...prev.categories];
      newCategories[categoryIndex] = { ...newCategories[categoryIndex], name };
      return { ...prev, categories: newCategories };
    });
  };

  const handleQuestionChange = (categoryIndex: number, questionIndex: number, field: 'question' | 'answer', value: string) => {
    setFaqContent(prev => {
      const newCategories = [...prev.categories];
      const newQuestions = [...newCategories[categoryIndex].questions];
      newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
      newCategories[categoryIndex] = { ...newCategories[categoryIndex], questions: newQuestions };
      return { ...prev, categories: newCategories };
    });
  };

  const addCategory = () => {
    setFaqContent(prev => ({
      ...prev,
      categories: [...prev.categories, { name: "Nova Categoria", questions: [{ question: "", answer: "" }] }]
    }));
  };

  const removeCategory = (categoryIndex: number) => {
    setFaqContent(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== categoryIndex)
    }));
  };

  const addQuestion = (categoryIndex: number) => {
    setFaqContent(prev => {
      const newCategories = [...prev.categories];
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        questions: [...newCategories[categoryIndex].questions, { question: "", answer: "" }]
      };
      return { ...prev, categories: newCategories };
    });
  };

  const removeQuestion = (categoryIndex: number, questionIndex: number) => {
    setFaqContent(prev => {
      const newCategories = [...prev.categories];
      newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        questions: newCategories[categoryIndex].questions.filter((_, i) => i !== questionIndex)
      };
      return { ...prev, categories: newCategories };
    });
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFaqContent(prev => {
        const oldIndex = categoryIds.indexOf(active.id as string);
        const newIndex = categoryIds.indexOf(over.id as string);
        return {
          ...prev,
          categories: arrayMove(prev.categories, oldIndex, newIndex)
        };
      });
    }
  };

  const handleQuestionsReorder = (catIndex: number, oldIndex: number, newIndex: number) => {
    setFaqContent(prev => {
      const newCategories = [...prev.categories];
      newCategories[catIndex] = {
        ...newCategories[catIndex],
        questions: arrayMove(newCategories[catIndex].questions, oldIndex, newIndex)
      };
      return { ...prev, categories: newCategories };
    });
  };

  const handleSave = () => {
    if (!faqContent.title || !faqContent.subtitle) {
      toast.error("Título e subtítulo são obrigatórios");
      return;
    }
    onSave('faq_content', faqContent);
  };

  const totalQuestions = faqContent.categories.reduce((acc, cat) => acc + cat.questions.length, 0);
  const categoryIds = faqContent.categories.map((_, idx) => `category-${idx}`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle>FAQ - Perguntas Frequentes</CardTitle>
        </div>
        <CardDescription>
          Gerencie as perguntas e respostas exibidas na página de planos. Arraste para reordenar.
          Atualmente: {faqContent.categories.length} categorias, {totalQuestions} perguntas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title and Subtitle */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="faq-title">Título da Seção</Label>
            <Input
              id="faq-title"
              value={faqContent.title}
              onChange={(e) => handleTitleChange('title', e.target.value)}
              placeholder="Ex: Perguntas e Respostas"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-subtitle">Subtítulo</Label>
            <Input
              id="faq-subtitle"
              value={faqContent.subtitle}
              onChange={(e) => handleTitleChange('subtitle', e.target.value)}
              placeholder="Ex: FAQ Completo – 10+ Perguntas"
            />
          </div>
        </div>

        {/* Categories Accordion */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Categorias e Perguntas</Label>
            <Button type="button" variant="outline" size="sm" onClick={addCategory}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Categoria
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" className="space-y-4">
                {faqContent.categories.map((category, catIndex) => (
                  <SortableCategory
                    key={`category-${catIndex}`}
                    id={`category-${catIndex}`}
                    category={category}
                    catIndex={catIndex}
                    onCategoryNameChange={handleCategoryNameChange}
                    onRemoveCategory={removeCategory}
                    onQuestionChange={handleQuestionChange}
                    onRemoveQuestion={removeQuestion}
                    onAddQuestion={addQuestion}
                    onQuestionsReorder={handleQuestionsReorder}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>

          {faqContent.categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma categoria criada ainda.</p>
              <p className="text-sm">Clique em "Nova Categoria" para começar.</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

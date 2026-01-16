import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Palette, Upload, Link2, CheckCircle2 } from "lucide-react";
import { FileUpload, DESIGN_VALIDATION } from "@/components/FileUpload";

// Cloud storage URL validation patterns
const CLOUD_STORAGE_PATTERNS = [
  { name: 'Google Drive', pattern: /^https?:\/\/(drive\.google\.com|docs\.google\.com)\/.+$/i },
  { name: 'Dropbox', pattern: /^https?:\/\/(www\.)?dropbox\.com\/.+$/i },
  { name: 'OneDrive', pattern: /^https?:\/\/(1drv\.ms|onedrive\.live\.com|[a-z0-9-]+\.sharepoint\.com)\/.+$/i },
  { name: 'iCloud', pattern: /^https?:\/\/(www\.)?icloud\.com\/.+$/i },
  { name: 'WeTransfer', pattern: /^https?:\/\/(we\.tl|wetransfer\.com)\/.+$/i },
  { name: 'Box', pattern: /^https?:\/\/(www\.)?box\.com\/.+$/i },
  { name: 'Mega', pattern: /^https?:\/\/(mega\.nz|mega\.io)\/.+$/i },
];

export interface CloudLinkValidation {
  isValid: boolean;
  provider: string | null;
  error: string | null;
}

export function validateCloudLink(url: string): CloudLinkValidation {
  if (!url || url.trim() === '') {
    return { isValid: true, provider: null, error: null }; // Empty is valid (optional field)
  }

  const trimmedUrl = url.trim();

  // Basic URL validation
  try {
    new URL(trimmedUrl);
  } catch {
    return { isValid: false, provider: null, error: 'URL inválida. Verifique o formato do link.' };
  }

  // Check if it matches any known cloud storage pattern
  for (const { name, pattern } of CLOUD_STORAGE_PATTERNS) {
    if (pattern.test(trimmedUrl)) {
      return { isValid: true, provider: name, error: null };
    }
  }

  // If it's a valid URL but not a recognized cloud storage
  return { 
    isValid: false, 
    provider: null, 
    error: 'Por favor, use um link de serviço de nuvem reconhecido (Google Drive, Dropbox, OneDrive, etc.)' 
  };
}

// Component for cloud link input with validation
interface CloudLinkInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function CloudLinkInput({ value, onChange, label = "Link do material de marca (opcional)", placeholder = "Ex: https://drive.google.com/... ou https://dropbox.com/..." }: CloudLinkInputProps) {
  const validation = useMemo(() => validateCloudLink(value), [value]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pr-10 ${validation.error ? 'border-destructive focus-visible:ring-destructive' : validation.provider ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.isValid && validation.provider ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : validation.error ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : null}
          </div>
        )}
      </div>
      {validation.error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {validation.error}
        </p>
      ) : validation.provider ? (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          Link do {validation.provider} detectado
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Serviços aceitos: Google Drive, Dropbox, OneDrive, iCloud, WeTransfer, Box, Mega
        </p>
      )}
    </div>
  );
}

// Types for briefing data
export interface SocialBriefing {
  objective: string; // educar, vender, engajar, institucional
  topics: string;
  tone: string; // formal, descontraído, inspirador, técnico
  mustIncludeElements: string[];
  competitorReferences: string;
}

export interface StationeryBriefing {
  fullName: string;
  cnpj: string;
  phones: string;
  commercialEmail: string;
  address: string;
  website: string;
  socialLinks: string;
  slogan: string;
  professionalRegistry: string; // CRM, OAB, CREA, etc.
}

export interface PresentationBriefing {
  objective: string; // institucional, pitch, treinamento, proposta
  targetAudience: string;
  mainSections: string;
  hasContent: boolean;
  desiredTone: string; // corporativo, moderno, minimalista
}

export interface EbookBriefing {
  title: string;
  targetAudience: string;
  chapterStructure: string;
  hasWrittenContent: boolean;
  finalCTA: string;
}

export interface MenuBriefing {
  establishmentType: string;
  menuCategories: string;
  itemsPerCategory: string;
  showPrices: boolean;
  highlights: string;
  contactDelivery: string;
}

export interface InvitationBriefing {
  eventType: string; // casamento, aniversário, corporativo, formatura
  honorees: string;
  dateTime: string;
  location: string;
  dressCode: string;
  rsvpMethod: string;
  specialMessage: string;
}

export interface BrandIdentityInfo {
  hasBrandIdentity: boolean;
  brandColors: string;
  wantsLogoCreation?: boolean;
  brandMaterialsLink?: string;
}

export const LOGO_CREATION_PRICE = 150;

interface BriefingFormProps {
  categoryId: string;
  briefingData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  brandInfo: BrandIdentityInfo;
  onBrandInfoChange: (info: BrandIdentityInfo) => void;
  brandFiles: File[];
  onBrandFilesChange: (files: File[]) => void;
}

const socialObjectives = [
  { value: "educar", label: "Educar / Informar" },
  { value: "vender", label: "Vender / Promover" },
  { value: "engajar", label: "Engajar / Interagir" },
  { value: "institucional", label: "Institucional / Branding" },
];

const toneOptions = [
  { value: "formal", label: "Formal / Profissional" },
  { value: "descontraido", label: "Descontraído / Amigável" },
  { value: "inspirador", label: "Inspirador / Motivacional" },
  { value: "tecnico", label: "Técnico / Especializado" },
];

const presentationObjectives = [
  { value: "institucional", label: "Institucional (sobre a empresa)" },
  { value: "pitch", label: "Pitch / Apresentação de negócios" },
  { value: "treinamento", label: "Treinamento / Educacional" },
  { value: "proposta", label: "Proposta comercial" },
];

const eventTypes = [
  { value: "casamento", label: "Casamento" },
  { value: "aniversario", label: "Aniversário" },
  { value: "corporativo", label: "Evento Corporativo" },
  { value: "formatura", label: "Formatura" },
  { value: "batizado", label: "Batizado / Religioso" },
  { value: "outro", label: "Outro" },
];

export function BriefingForm({ categoryId, briefingData, onChange, brandInfo, onBrandInfoChange, brandFiles, onBrandFilesChange }: BriefingFormProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...briefingData, [field]: value });
  };

  // Check if this is a brand creation category (the product IS logo creation)
  const isBrandCreationCategory = categoryId === 'criacao-marca' || categoryId === 'cat-brand';

  // Render brand identity section for brand creation category (special behavior)
  const renderBrandCreationSection = () => (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Sobre sua Marca
        </CardTitle>
        <CardDescription>
          Nos conte sobre a marca que vamos criar ou reformular
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Você já tem uma marca que deseja reformular?</Label>
          <RadioGroup
            value={brandInfo.hasBrandIdentity ? "yes" : "no"}
            onValueChange={(v) => onBrandInfoChange({ ...brandInfo, hasBrandIdentity: v === "yes", wantsLogoCreation: false })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="rebrand-yes" />
              <Label htmlFor="rebrand-yes" className="font-normal cursor-pointer">Sim, quero reformular</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="rebrand-no" />
              <Label htmlFor="rebrand-no" className="font-normal cursor-pointer">Não, criar do zero</Label>
            </div>
          </RadioGroup>
        </div>

        {brandInfo.hasBrandIdentity && (
          <>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Palette className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Reformulação de marca</p>
                <p className="text-muted-foreground">
                  Envie sua marca atual para que possamos criar uma versão modernizada mantendo a essência.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload da marca atual</Label>
              <FileUpload
                files={brandFiles}
                onFilesSelected={(files) => onBrandFilesChange([...brandFiles, ...files].slice(0, 3))}
                onFileRemove={(idx) => onBrandFilesChange(brandFiles.filter((_, i) => i !== idx))}
                maxFiles={3}
                validation={DESIGN_VALIDATION}
                accept="image/*,.pdf,.ai,.eps"
                label="Arquivos da marca atual"
                description="Logo atual, manual de marca, materiais existentes (até 3 arquivos)"
                variant="compact"
              />
            </div>

            <CloudLinkInput
              value={brandInfo.brandMaterialsLink || ''}
              onChange={(value) => onBrandInfoChange({ ...brandInfo, brandMaterialsLink: value })}
            />

            <div className="space-y-2">
              <Label>O que você gostaria de manter ou mudar?</Label>
              <Textarea
                placeholder="Ex: Gostaria de manter as cores mas modernizar o símbolo, mudar a tipografia..."
                value={briefingData.rebrandNotes || ''}
                onChange={(e) => updateField('rebrandNotes', e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
          </>
        )}

        {!brandInfo.hasBrandIdentity && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Criação do zero</p>
              <p className="text-muted-foreground">
                Nossa equipe criará uma identidade visual única e profissional para sua marca. 
                Você receberá todos os arquivos editáveis (AI, EPS), PNG, JPG e PDF em alta qualidade.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render brand identity section (common to all NON-brand-creation categories)
  const renderBrandIdentitySection = () => (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Sua Identidade Visual
        </CardTitle>
        <CardDescription>
          Nos ajude a manter a consistência da sua marca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Já possui logo/identidade visual?</Label>
          <RadioGroup
            value={brandInfo.hasBrandIdentity ? "yes" : "no"}
            onValueChange={(v) => onBrandInfoChange({ ...brandInfo, hasBrandIdentity: v === "yes" })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="brand-yes" />
              <Label htmlFor="brand-yes" className="font-normal cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="brand-no" />
              <Label htmlFor="brand-no" className="font-normal cursor-pointer">Não</Label>
            </div>
          </RadioGroup>
        </div>

        {brandInfo.hasBrandIdentity && (
          <>
            <div className="space-y-2">
              <Label>Cores da marca (opcional)</Label>
              <Input
                placeholder="Ex: Azul marinho (#1E2A47) e dourado"
                value={brandInfo.brandColors}
                onChange={(e) => onBrandInfoChange({ ...brandInfo, brandColors: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Informe os códigos hex ou descreva as cores principais
              </p>
            </div>

            <div className="space-y-2">
              <Label>Upload da logo/manual de marca</Label>
              <FileUpload
                files={brandFiles}
                onFilesSelected={(files) => onBrandFilesChange([...brandFiles, ...files].slice(0, 3))}
                onFileRemove={(idx) => onBrandFilesChange(brandFiles.filter((_, i) => i !== idx))}
                maxFiles={3}
                validation={DESIGN_VALIDATION}
                accept="image/*,.pdf,.ai,.eps"
                label="Arquivos de marca"
                description="Logo, manual de marca, paleta de cores (até 3 arquivos)"
                variant="compact"
              />
            </div>

            <CloudLinkInput
              value={brandInfo.brandMaterialsLink || ''}
              onChange={(value) => onBrandInfoChange({ ...brandInfo, brandMaterialsLink: value })}
            />
          </>
        )}

        {!brandInfo.hasBrandIdentity && (
          <div className="space-y-4">
            {/* Logo creation offer */}
            <div 
              onClick={() => onBrandInfoChange({ ...brandInfo, wantsLogoCreation: !brandInfo.wantsLogoCreation })}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                brandInfo.wantsLogoCreation 
                  ? 'border-primary bg-primary/10' 
                  : 'border-primary/50 bg-primary/5 hover:border-primary/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                  brandInfo.wantsLogoCreation 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`}>
                  {brandInfo.wantsLogoCreation && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">Criar minha logomarca</p>
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      + R$ {LOGO_CREATION_PRICE},00
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nossa equipe criará uma logomarca profissional para sua marca.
                  </p>
                  <div className="mt-3 p-3 rounded-md bg-green-500/10 border border-green-500/30">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        <strong>Após a criação, todo o material será enviado para você</strong> usar como quiser: 
                        arquivos editáveis, PNG, JPG e PDF em alta qualidade.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!brandInfo.wantsLogoCreation && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Sem logo?</p>
                  <p className="text-muted-foreground">
                    Nosso designer criará o material utilizando seu nome comercial.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Social Media briefing
  if (categoryId === 'artes-redes-sociais' || categoryId === 'cat-social') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing para Redes Sociais</CardTitle>
            <CardDescription>Nos ajude a criar as artes perfeitas para suas redes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo principal das postagens *</Label>
              <Select value={briefingData.objective || ''} onValueChange={(v) => updateField('objective', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo..." />
                </SelectTrigger>
                <SelectContent>
                  {socialObjectives.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temas/assuntos para as artes *</Label>
              <Textarea
                placeholder="Ex: Dicas de organização financeira, promoções de produtos, frases motivacionais, novidades da empresa..."
                value={briefingData.topics || ''}
                onChange={(e) => updateField('topics', e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{(briefingData.topics || '').length}/1000</p>
            </div>

            <div className="space-y-2">
              <Label>Tom de voz *</Label>
              <Select value={briefingData.tone || ''} onValueChange={(v) => updateField('tone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Como deseja se comunicar..." />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Elementos obrigatórios nas artes</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Logo sempre visível', 'Telefone/WhatsApp', 'Site/Link', 'Redes sociais', 'Endereço', 'Slogan'].map((el) => (
                  <div key={el} className="flex items-center space-x-2">
                    <Checkbox
                      id={`el-${el}`}
                      checked={(briefingData.mustIncludeElements || []).includes(el)}
                      onCheckedChange={(checked) => {
                        const current = briefingData.mustIncludeElements || [];
                        if (checked) {
                          updateField('mustIncludeElements', [...current, el]);
                        } else {
                          updateField('mustIncludeElements', current.filter((e: string) => e !== el));
                        }
                      }}
                    />
                    <Label htmlFor={`el-${el}`} className="font-normal text-sm cursor-pointer">{el}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Referências visuais (opcional)</Label>
              <Textarea
                placeholder="Ex: Gosto do estilo do perfil @exemplo, cores clean como a marca X, design minimalista..."
                value={briefingData.competitorReferences || ''}
                onChange={(e) => updateField('competitorReferences', e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stationery briefing
  if (categoryId === 'kit-papelaria' || categoryId === 'cartao-visita' || categoryId === 'papel-timbrado' || categoryId === 'envelope' || categoryId === 'cat-papelaria') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados para a Papelaria</CardTitle>
            <CardDescription>Informações que aparecerão nos materiais impressos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo / Razão social *</Label>
                <Input
                  placeholder="Nome que aparecerá no material"
                  value={briefingData.fullName || ''}
                  onChange={(e) => updateField('fullName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={briefingData.cnpj || ''}
                  onChange={(e) => updateField('cnpj', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone(s) *</Label>
                <Input
                  placeholder="(11) 99999-9999 / (11) 3333-3333"
                  value={briefingData.phones || ''}
                  onChange={(e) => updateField('phones', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email comercial *</Label>
                <Input
                  type="email"
                  placeholder="contato@suaempresa.com"
                  value={briefingData.commercialEmail || ''}
                  onChange={(e) => updateField('commercialEmail', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço completo *</Label>
              <Textarea
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                value={briefingData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site/Domínio (opcional)</Label>
                <Input
                  placeholder="www.suaempresa.com.br"
                  value={briefingData.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Redes sociais (opcional)</Label>
                <Input
                  placeholder="@instagram, /facebook"
                  value={briefingData.socialLinks || ''}
                  onChange={(e) => updateField('socialLinks', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slogan/Tagline (opcional)</Label>
                <Input
                  placeholder="Sua frase de efeito"
                  value={briefingData.slogan || ''}
                  onChange={(e) => updateField('slogan', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Registro profissional (opcional)</Label>
                <Input
                  placeholder="CRM, OAB, CREA, etc."
                  value={briefingData.professionalRegistry || ''}
                  onChange={(e) => updateField('professionalRegistry', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Presentation briefing
  if (categoryId === 'apresentacao' || categoryId === 'cat-apresentacoes') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing da Apresentação</CardTitle>
            <CardDescription>Detalhes sobre o conteúdo e estilo desejado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo da apresentação *</Label>
              <Select value={briefingData.objective || ''} onValueChange={(v) => updateField('objective', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo..." />
                </SelectTrigger>
                <SelectContent>
                  {presentationObjectives.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Público-alvo *</Label>
              <Input
                placeholder="Ex: Investidores, clientes potenciais, colaboradores..."
                value={briefingData.targetAudience || ''}
                onChange={(e) => updateField('targetAudience', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tópicos/seções principais *</Label>
              <Textarea
                placeholder="Liste os principais tópicos ou seções que a apresentação deve conter..."
                value={briefingData.mainSections || ''}
                onChange={(e) => updateField('mainSections', e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>

            <div className="space-y-3">
              <Label>Você já tem o conteúdo escrito?</Label>
              <RadioGroup
                value={briefingData.hasContent ? "yes" : "no"}
                onValueChange={(v) => updateField('hasContent', v === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="content-yes" />
                  <Label htmlFor="content-yes" className="font-normal cursor-pointer">Sim, vou enviar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="content-no" />
                  <Label htmlFor="content-no" className="font-normal cursor-pointer">Não, preciso de ajuda</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Tom visual desejado *</Label>
              <Select value={briefingData.desiredTone || ''} onValueChange={(v) => updateField('desiredTone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estilo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporativo">Corporativo / Clássico</SelectItem>
                  <SelectItem value="moderno">Moderno / Arrojado</SelectItem>
                  <SelectItem value="minimalista">Minimalista / Clean</SelectItem>
                  <SelectItem value="criativo">Criativo / Colorido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // E-book briefing
  if (categoryId === 'ebook' || categoryId === 'cat-ebook') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing do E-book/Material Rico</CardTitle>
            <CardDescription>Informações sobre o conteúdo do material</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título do material *</Label>
              <Input
                placeholder="Ex: Guia Completo de Marketing Digital"
                value={briefingData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Público-alvo *</Label>
              <Input
                placeholder="Para quem é este material?"
                value={briefingData.targetAudience || ''}
                onChange={(e) => updateField('targetAudience', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Estrutura de capítulos/seções *</Label>
              <Textarea
                placeholder="Liste os capítulos ou tópicos do material..."
                value={briefingData.chapterStructure || ''}
                onChange={(e) => updateField('chapterStructure', e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>

            <div className="space-y-3">
              <Label>O conteúdo já está escrito?</Label>
              <RadioGroup
                value={briefingData.hasWrittenContent ? "yes" : "no"}
                onValueChange={(v) => updateField('hasWrittenContent', v === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="written-yes" />
                  <Label htmlFor="written-yes" className="font-normal cursor-pointer">Sim, vou enviar o documento</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="written-no" />
                  <Label htmlFor="written-no" className="font-normal cursor-pointer">Não, preciso de ajuda</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Call-to-action final (opcional)</Label>
              <Input
                placeholder="O que você quer que o leitor faça após ler? Ex: Agendar consulta, Visitar site..."
                value={briefingData.finalCTA || ''}
                onChange={(e) => updateField('finalCTA', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Menu briefing
  if (categoryId === 'cardapio-digital' || categoryId === 'cat-cardapio') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing do Cardápio Digital</CardTitle>
            <CardDescription>Informações sobre seu estabelecimento e menu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de estabelecimento *</Label>
              <Input
                placeholder="Ex: Pizzaria, Hamburgueria, Restaurante japonês..."
                value={briefingData.establishmentType || ''}
                onChange={(e) => updateField('establishmentType', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categorias do cardápio *</Label>
              <Textarea
                placeholder="Ex: Entradas, Pratos principais, Bebidas, Sobremesas, Combos..."
                value={briefingData.menuCategories || ''}
                onChange={(e) => updateField('menuCategories', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantidade aproximada de itens por categoria</Label>
              <Input
                placeholder="Ex: 5 entradas, 15 pratos, 10 bebidas"
                value={briefingData.itemsPerCategory || ''}
                onChange={(e) => updateField('itemsPerCategory', e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Os preços devem aparecer no cardápio?</Label>
              <RadioGroup
                value={briefingData.showPrices ? "yes" : "no"}
                onValueChange={(v) => updateField('showPrices', v === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="prices-yes" />
                  <Label htmlFor="prices-yes" className="font-normal cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="prices-no" />
                  <Label htmlFor="prices-no" className="font-normal cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Destaques/promoções (opcional)</Label>
              <Textarea
                placeholder="Itens em destaque, combos especiais, pratos do dia..."
                value={briefingData.highlights || ''}
                onChange={(e) => updateField('highlights', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Contato/delivery (opcional)</Label>
              <Input
                placeholder="WhatsApp, telefone, app de delivery..."
                value={briefingData.contactDelivery || ''}
                onChange={(e) => updateField('contactDelivery', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation briefing
  if (categoryId === 'convite-digital' || categoryId === 'cat-convite') {
    return (
      <div className="space-y-6">
        {renderBrandIdentitySection()}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing do Convite Digital</CardTitle>
            <CardDescription>Detalhes do evento para o convite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de evento *</Label>
              <Select value={briefingData.eventType || ''} onValueChange={(v) => updateField('eventType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome do(s) homenageado(s) *</Label>
              <Input
                placeholder="Ex: Maria & João, Ana (15 anos), Empresa XYZ..."
                value={briefingData.honorees || ''}
                onChange={(e) => updateField('honorees', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data e horário *</Label>
                <Input
                  placeholder="Ex: 25 de dezembro de 2024, às 20h"
                  value={briefingData.dateTime || ''}
                  onChange={(e) => updateField('dateTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dress code (opcional)</Label>
                <Input
                  placeholder="Ex: Traje esporte fino"
                  value={briefingData.dressCode || ''}
                  onChange={(e) => updateField('dressCode', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local com endereço *</Label>
              <Textarea
                placeholder="Nome do local e endereço completo"
                value={briefingData.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmação de presença *</Label>
              <Input
                placeholder="WhatsApp, telefone ou link para confirmação"
                value={briefingData.rsvpMethod || ''}
                onChange={(e) => updateField('rsvpMethod', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem especial (opcional)</Label>
              <Textarea
                placeholder="Texto personalizado para o convite..."
                value={briefingData.specialMessage || ''}
                onChange={(e) => updateField('specialMessage', e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if it's the Brand Kit package specifically
  const isBrandKitPackage = briefingData._packageId === 'pkg-brand-kit';

  // Brand creation briefing (special case - this IS the logo creation product)
  if (isBrandCreationCategory) {
    return (
      <div className="space-y-6">
        {renderBrandCreationSection()}

        {/* Brand Kit specific info */}
        {isBrandKitPackage && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                O que está incluído no Brand Kit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span><strong>Logo principal + variações</strong> (horizontal, vertical, ícone)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span><strong>Paleta de cores</strong> definida com códigos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span><strong>Tipografias</strong> primária e secundária</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span><strong>Manual básico de uso</strong> da marca</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Arquivos em alta resolução (PNG, JPG, PDF)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Arquivos vetoriais editáveis (.AI, .EPS)</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing da Marca</CardTitle>
            <CardDescription>Nos conte sobre o conceito da sua marca</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da marca/empresa *</Label>
              <Input
                placeholder="Nome que aparecerá na logomarca"
                value={briefingData.brandName || ''}
                onChange={(e) => updateField('brandName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Slogan/tagline (opcional)</Label>
              <Input
                placeholder="Ex: Sua frase de efeito, se tiver"
                value={briefingData.slogan || ''}
                onChange={(e) => updateField('slogan', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ramo de atuação *</Label>
              <Input
                placeholder="Ex: Advocacia, Odontologia, Restaurante, Tecnologia..."
                value={briefingData.businessField || ''}
                onChange={(e) => updateField('businessField', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Público-alvo *</Label>
              <Textarea
                placeholder="Descreva quem são seus clientes ideais..."
                value={briefingData.targetAudience || ''}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cores de preferência (opcional)</Label>
              <Input
                placeholder="Ex: Azul e dourado, cores vibrantes, tons neutros..."
                value={briefingData.colorPreference || ''}
                onChange={(e) => updateField('colorPreference', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Estilo desejado *</Label>
              <Select value={briefingData.stylePreference || ''} onValueChange={(v) => updateField('stylePreference', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estilo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimalista">Minimalista / Clean</SelectItem>
                  <SelectItem value="moderno">Moderno / Contemporâneo</SelectItem>
                  <SelectItem value="classico">Clássico / Elegante</SelectItem>
                  <SelectItem value="divertido">Divertido / Colorido</SelectItem>
                  <SelectItem value="corporativo">Corporativo / Profissional</SelectItem>
                  <SelectItem value="artesanal">Artesanal / Handmade</SelectItem>
                  <SelectItem value="tecnologico">Tecnológico / Futurista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conceito/valores da marca</Label>
              <Textarea
                placeholder="Descreva a essência da sua marca: valores, diferenciais, sentimentos que deseja transmitir..."
                value={briefingData.brandConcept || ''}
                onChange={(e) => updateField('brandConcept', e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label>Referências visuais (opcional)</Label>
              <Textarea
                placeholder="Links de marcas que você admira ou descrição de estilos que gosta..."
                value={briefingData.visualReferences || ''}
                onChange={(e) => updateField('visualReferences', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default/generic briefing
  return (
    <div className="space-y-6">
      {renderBrandIdentitySection()}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes do Pedido</CardTitle>
          <CardDescription>Descreva o que você precisa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição detalhada do projeto *</Label>
            <Textarea
              placeholder="Descreva em detalhes o que você precisa, incluindo textos, estilo, cores e qualquer informação relevante..."
              value={briefingData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">{(briefingData.description || '').length}/2000</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Service limits display component
export function ServiceLimitsCard({ estimatedDays, maxRevisions = 2 }: { estimatedDays?: number | null; maxRevisions?: number }) {
  return (
    <Card className="bg-muted/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          O que está incluído
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span>2 versões iniciais</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span>{maxRevisions} rodadas de correção</span>
        </div>
        {estimatedDays && (
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span>Prazo: ~{estimatedDays} dias úteis</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span>Arquivos em alta qualidade (PNG/PDF)</span>
        </div>
        <div className="pt-2 border-t mt-3">
          <p className="text-xs text-muted-foreground">
            ⚠️ Após aprovação, correções adicionais podem ser contratadas separadamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

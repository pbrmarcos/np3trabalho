-- Insert Brand Kit package
INSERT INTO design_packages (
  id, 
  category_id, 
  name, 
  description, 
  price, 
  estimated_days, 
  display_order, 
  is_active, 
  is_bundle,
  includes
) VALUES (
  'pkg-brand-kit',
  'cat-brand',
  'Brand Kit Completo',
  'Kit completo de identidade visual com logo, cores, tipografia e manual de uso',
  750,
  10,
  1,
  true,
  false,
  ARRAY[
    'Logo principal + variações (horizontal, vertical, ícone)',
    'Paleta de cores definida',
    'Tipografias primária e secundária',
    'Manual básico de uso da marca',
    'Arquivos em alta resolução (PNG, JPG)',
    'Arquivos vetoriais editáveis (.AI, .PDF)'
  ]
);
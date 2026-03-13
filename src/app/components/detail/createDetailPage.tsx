import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTeam } from "../../context/TeamContext";
import { DetailPageShell } from "./DetailPageShell";
import type { PageTypeMeta } from "./pageTypes";

// ─── Loading Spinner ─────────────────────────────────────────────

export function DetailLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Factory Config ──────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface DetailPageConfig<TData> {
  /** Page type metadata (from pageTypes registry) */
  meta: PageTypeMeta;

  /**
   * Custom hook that returns the item data + CRUD handlers.
   * Called at the top level of the generated component.
   * Must handle: loading existing item, creating new items, navigation after delete.
   */
  useData: (id: string | undefined) => {
    item: TData | null;
    itemId: string;
    handleUpdate: (updates: Partial<TData>) => void;
    handleDelete: () => void;
  };

  /** Title section — a component that receives item + update */
  TitleComponent: React.FC<DetailSectionProps<TData>>;

  /** Properties section — a component that returns AutoProperties or custom JSX */
  PropertiesComponent: React.FC<DetailSectionProps<TData>>;

  /** Secondary properties — collapsed by default (less important fields) */
  SecondaryPropertiesComponent?: React.FC<DetailSectionProps<TData>>;

  /** Main body content */
  BodyComponent: React.FC<DetailSectionProps<TData>>;

  /** Optional: content above the title (e.g., logo+title row for brands) */
  TitlePrefixComponent?: React.FC<DetailSectionProps<TData>>;

  /** Optional: breadcrumbs factory */
  getBreadcrumbs?: (item: TData, ko: boolean) => BreadcrumbItem[];

  /** Optional: collapsed preview badges */
  CollapsedPreviewComponent?: React.FC<{ item: TData; ko: boolean }>;

  /** Optional: extra action buttons */
  ExtraActionsComponent?: React.FC<{ item: TData }>;

  /** Whether properties are collapsible (default: true) */
  collapsible?: boolean;

  /** Whether to use narrow width (default: true) */
  narrow?: boolean;
}

/** Props passed to each section component */
export interface DetailSectionProps<TData> {
  item: TData;
  onUpdate: (updates: Partial<TData>) => void;
  ko: boolean;
  language: string;
}

// ─── Factory Function ────────────────────────────────────────────

export function createDetailPage<TData>(config: DetailPageConfig<TData>): React.FC {
  const {
    meta,
    useData,
    TitleComponent,
    PropertiesComponent,
    SecondaryPropertiesComponent,
    BodyComponent,
    TitlePrefixComponent,
    getBreadcrumbs,
    CollapsedPreviewComponent,
    ExtraActionsComponent,
    collapsible,
    narrow,
  } = config;

  return function GeneratedDetailPage() {
    const params = useParams();
    const { language } = useLanguage();
    const { currentUser } = useTeam();
    const ko = language === "ko";

    const id = params[meta.paramName] as string | undefined;
    const { item, itemId, handleUpdate, handleDelete } = useData(id);

    if (!item) {
      return <DetailLoadingSpinner />;
    }

    const sectionProps: DetailSectionProps<TData> = {
      item,
      onUpdate: handleUpdate,
      ko,
      language,
    };

    return (
      <DetailPageShell
        shareType={meta.shareType}
        itemId={itemId}
        currentUserId={currentUser.id}
        backPath={meta.backPath}
        backLabel={ko ? meta.backLabel.ko : meta.backLabel.en}
        onDelete={handleDelete}
        breadcrumbs={getBreadcrumbs?.(item, ko)}
        titlePrefix={TitlePrefixComponent ? <TitlePrefixComponent {...sectionProps} /> : undefined}
        title={<TitleComponent {...sectionProps} />}
        properties={<PropertiesComponent {...sectionProps} />}
        secondaryProperties={SecondaryPropertiesComponent ? <SecondaryPropertiesComponent {...sectionProps} /> : undefined}
        collapsible={collapsible}
        collapsedPreview={
          CollapsedPreviewComponent ? <CollapsedPreviewComponent item={item} ko={ko} /> : undefined
        }
        extraActions={
          ExtraActionsComponent ? <ExtraActionsComponent item={item} /> : undefined
        }
        narrow={narrow}
      >
        <BodyComponent {...sectionProps} />
      </DetailPageShell>
    );
  };
}

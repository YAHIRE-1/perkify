import type { AppRouterInputs } from "@perkify/api/routers/index";
import { Badge } from "@perkify/ui/components/badge";
import { Button } from "@perkify/ui/components/button";
import { Input } from "@perkify/ui/components/input";
import { ReactSelect } from "@perkify/ui/components/react-select";
import { X } from "lucide-react";
import { useMemo } from "react";

type ListInput = AppRouterInputs["quests"]["list"];

export type QuestFilterValues = Pick<
	ListInput,
	"search" | "category" | "tokenId" | "isBoosted" | "includeArchived" | "mine"
>;

export type TokenOption = { id: string; symbol: string };

const boostedOptions = [
	{ value: "all", label: "Todas" },
	{ value: "boosted", label: "Solo boosted" },
];

const statusOptions = [
	{ value: "active", label: "Solo activas" },
	{ value: "all", label: "Incluir archivadas" },
];

const ownerOptions = [
	{ value: "all", label: "Todas las quests" },
	{ value: "mine", label: "Mis quests" },
];

type QuestsFiltersProps = {
	value: QuestFilterValues;
	onChange: (patch: Partial<QuestFilterValues>) => void;
	tokens?: TokenOption[];
	showMineFilter?: boolean;
	showTokenAndBoostFilters?: boolean;
};

export function QuestsFilters({
	value,
	onChange,
	tokens = [],
	showMineFilter = true,
	showTokenAndBoostFilters = true,
}: QuestsFiltersProps) {
	const tokenOptions = useMemo(
		() => [
			{ value: "all", label: "Todos los tokens" },
			...tokens.map((t) => ({ value: t.id, label: t.symbol })),
		],
		[tokens],
	);

	const selectedTokenSymbol = tokens.find((t) => t.id === value.tokenId)?.symbol;

	const hasSearch = !!value.search?.trim();
	const hasCategory = !!value.category?.trim();
	const hasToken = showTokenAndBoostFilters && !!value.tokenId;
	const hasBoosted = showTokenAndBoostFilters && !!value.isBoosted;
	const hasArchived = !!value.includeArchived;
	const hasMine = showMineFilter && !!value.mine;
	const hasActiveFilters =
		hasSearch || hasCategory || hasToken || hasBoosted || hasArchived || hasMine;

	const clearAllFilters = () =>
		onChange({
			search: undefined,
			category: undefined,
			tokenId: undefined,
			isBoosted: undefined,
			includeArchived: undefined,
			mine: undefined,
		});

	return (
		<div className="space-y-4">
			{/* Fila 1: Buscadores */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Input
					aria-label="Buscar"
					className="h-9 flex-1"
					onChange={(e) => onChange({ search: e.target.value || undefined })}
					placeholder="Buscar quests..."
					type="text"
					value={value.search ?? ""}
				/>
				<Input
					aria-label="Categoría"
					className="h-9 flex-1"
					onChange={(e) => onChange({ category: e.target.value || undefined })}
					placeholder="Categoría"
					type="text"
					value={value.category ?? ""}
				/>
			</div>

			{/* Fila 2: Dropdowns */}
			<div className="flex flex-wrap gap-3">
				{showTokenAndBoostFilters && (
					<>
						<ReactSelect
							className="min-w-37.5 flex-1"
							onChange={(option) =>
								onChange({
									tokenId: option?.value === "all" ? undefined : option?.value,
								})
							}
							options={tokenOptions}
							placeholder="Token"
							value={tokenOptions.find(
								(opt) => opt.value === (value.tokenId ?? "all"),
							)}
						/>
						<ReactSelect
							className="min-w-37.5 flex-1"
							onChange={(option) =>
								onChange({
									isBoosted: option?.value === "boosted" ? true : undefined,
								})
							}
							options={boostedOptions}
							placeholder="Boost"
							value={boostedOptions.find(
								(opt) => opt.value === (value.isBoosted ? "boosted" : "all"),
							)}
						/>
					</>
				)}
				<ReactSelect
					className="min-w-40 flex-1"
					onChange={(option) =>
						onChange({
							includeArchived: option?.value === "all" ? true : undefined,
						})
					}
					options={statusOptions}
					placeholder="Estatus"
					value={statusOptions.find(
						(opt) => opt.value === (value.includeArchived ? "all" : "active"),
					)}
				/>
				{showMineFilter && (
					<ReactSelect
						className="min-w-40 flex-1"
						onChange={(option) =>
							onChange({ mine: option?.value === "mine" ? true : undefined })
						}
						options={ownerOptions}
						placeholder="Propietario"
						value={ownerOptions.find(
							(opt) => opt.value === (value.mine ? "mine" : "all"),
						)}
					/>
				)}
			</div>

			{/* Fila 3: Badges de filtros activos */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 border-t pt-2">
					<span className="mr-1 text-muted-foreground text-xs">
						Filtros activos:
					</span>
					{hasSearch && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ search: undefined })}
							variant="outline"
						>
							Búsqueda: "{value.search}"
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasCategory && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ category: undefined })}
							variant="outline"
						>
							Categoría: {value.category}
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasToken && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ tokenId: undefined })}
							variant="outline"
						>
							Token: {selectedTokenSymbol ?? "…"}
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasBoosted && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ isBoosted: undefined })}
							variant="outline"
						>
							Solo boosted
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasArchived && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ includeArchived: undefined })}
							variant="outline"
						>
							Incluye archivadas
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasMine && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ mine: undefined })}
							variant="outline"
						>
							Mis quests
							<X className="ml-1 size-3" />
						</Badge>
					)}
					<Button
						className="ml-auto h-7 px-2 text-xs"
						onClick={clearAllFilters}
						variant="ghost"
					>
						Limpiar todo
						<X className="ml-1 size-3" />
					</Button>
				</div>
			)}
		</div>
	);
}
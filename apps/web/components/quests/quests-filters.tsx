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
	"search" | "category" | "tokenId" | "isBoosted" | "mine"
>;

export type TokenOption = { id: string; symbol: string };

const boostedOptions = [
	{ value: "all", label: "All" },
	{ value: "boosted", label: "Boosted only" },
];

const ownerOptions = [
	{ value: "all", label: "All quests" },
	{ value: "mine", label: "My quests" },
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
			{ value: "all", label: "All tokens" },
			...tokens.map((t) => ({ value: t.id, label: t.symbol })),
		],
		[tokens],
	);

	const selectedTokenSymbol = tokens.find((t) => t.id === value.tokenId)?.symbol;

	const hasSearch = !!value.search?.trim();
	const hasCategory = !!value.category?.trim();
	const hasToken = showTokenAndBoostFilters && !!value.tokenId;
	const hasBoosted = showTokenAndBoostFilters && !!value.isBoosted;
	const hasMine = showMineFilter && !!value.mine;
	const hasActiveFilters =
		hasSearch || hasCategory || hasToken || hasBoosted || hasMine;

	const clearAllFilters = () =>
		onChange({
			search: undefined,
			category: undefined,
			tokenId: undefined,
			isBoosted: undefined,
			mine: undefined,
		});

	return (
		<div className="space-y-4">
			{/* Row 1: Search inputs */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Input
					aria-label="Search"
					className="h-9 flex-1"
					onChange={(e) => onChange({ search: e.target.value || undefined })}
					placeholder="Search quests..."
					type="text"
					value={value.search ?? ""}
				/>
				<Input
					aria-label="Category"
					className="h-9 flex-1"
					onChange={(e) => onChange({ category: e.target.value || undefined })}
					placeholder="Category"
					type="text"
					value={value.category ?? ""}
				/>
			</div>

			{/* Row 2: Dropdowns */}
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
				{showMineFilter && (
					<ReactSelect
						className="min-w-40 flex-1"
						onChange={(option) =>
							onChange({ mine: option?.value === "mine" ? true : undefined })
						}
						options={ownerOptions}
						placeholder="Owner"
						value={ownerOptions.find(
							(opt) => opt.value === (value.mine ? "mine" : "all"),
						)}
					/>
				)}
			</div>

			{/* Row 3: Active filter badges */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 border-t pt-2">
					<span className="mr-1 text-muted-foreground text-xs">
						Active filters:
					</span>
					{hasSearch && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ search: undefined })}
							variant="outline"
						>
							Search: "{value.search}"
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasCategory && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ category: undefined })}
							variant="outline"
						>
							Category: {value.category}
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
							Boosted only
							<X className="ml-1 size-3" />
						</Badge>
					)}
					{hasMine && (
						<Badge
							className="cursor-pointer hover:bg-muted"
							onClick={() => onChange({ mine: undefined })}
							variant="outline"
						>
							My quests
							<X className="ml-1 size-3" />
						</Badge>
					)}
					<Button
						className="ml-auto h-7 px-2 text-xs"
						onClick={clearAllFilters}
						variant="ghost"
					>
						Clear all
						<X className="ml-1 size-3" />
					</Button>
				</div>
			)}
		</div>
	);
}

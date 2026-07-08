import { useEffect, useState } from "react";
import type { SoundEffect } from "@/sounds/types";

export type SoundLibraryType = "effects" | "music";

export function useSoundSearch({
	query,
	commercialOnly,
	type,
}: {
	query: string;
	commercialOnly: boolean;
	type: SoundLibraryType;
}) {
	const [searchResults, setSearchResults] = useState<SoundEffect[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [lastSearchQuery, setLastSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [totalCount, setTotalCount] = useState(0);

	const loadMore = async () => {
		if (isLoadingMore || !hasNextPage) return;

		try {
			setIsLoadingMore(true);
			const nextPage = currentPage + 1;

			const searchParams = new URLSearchParams({
				page: nextPage.toString(),
				type,
			});

			if (query.trim()) {
				searchParams.set("q", query);
			}

			searchParams.set("commercial_only", commercialOnly.toString());
			const response = await fetch(
				`/api/sounds/search?${searchParams.toString()}`,
			);

			if (response.ok) {
				const data = await response.json();
				setSearchResults((prev) => [...prev, ...data.results]);
				setCurrentPage(nextPage);
				setHasNextPage(!!data.next);
				setTotalCount(data.count);
			} else {
				setSearchError(`Load more failed: ${response.status}`);
			}
		} catch (err) {
			setSearchError(
				err instanceof Error ? err.message : "Load more failed",
			);
		} finally {
			setIsLoadingMore(false);
		}
	};

	useEffect(() => {
		if (!query.trim()) {
			setSearchResults([]);
			setSearchError(null);
			setLastSearchQuery("");
			setCurrentPage(1);
			setHasNextPage(false);
			setTotalCount(0);
			return;
		}

		if (query === lastSearchQuery && searchResults.length > 0) {
			return;
		}

		let ignore = false;

		const timeoutId = setTimeout(async () => {
			try {
				setIsSearching(true);
				setSearchError(null);
				setCurrentPage(1);
				setHasNextPage(false);
				setTotalCount(0);

				const response = await fetch(
					`/api/sounds/search?q=${encodeURIComponent(query)}&type=${type}&page=1&commercial_only=${commercialOnly}`,
				);

				if (!ignore) {
					if (response.ok) {
						const data = await response.json();
						setSearchResults(data.results);
						setLastSearchQuery(query);
						setHasNextPage(!!data.next);
						setTotalCount(data.count);
						setCurrentPage(1);
					} else {
						setSearchError(`Search failed: ${response.status}`);
					}
				}
			} catch (err) {
				if (!ignore) {
					setSearchError(
						err instanceof Error ? err.message : "Search failed",
					);
				}
			} finally {
				if (!ignore) {
					setIsSearching(false);
				}
			}
		}, 300);

		return () => {
			clearTimeout(timeoutId);
			ignore = true;
		};
	}, [query, lastSearchQuery, searchResults.length, type, commercialOnly]);

	return {
		results: searchResults,
		isLoading: isSearching,
		error: searchError,
		loadMore,
		hasNextPage,
		isLoadingMore,
		totalCount,
	};
}

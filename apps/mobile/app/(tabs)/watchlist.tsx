import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { Plus, Trash2, Search } from "lucide-react-native";
import { dir, fmtPct } from "@stocktracker/shared";
import {
  useWatchlist,
  useAddWatchlist,
  useRemoveWatchlist,
} from "@/api/queries";
import { searchTicker, type SearchResult } from "@/api/endpoints";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num } from "@/components/Typography";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/ThemeProvider";
import { haptic } from "@/haptics";
import type { WatchlistRow } from "@stocktracker/api-contracts";

function priceLabel(row: WatchlistRow) {
  return row.currency === "GBp"
    ? `${row.lastPrice.toFixed(0)}p`
    : `£${row.lastPrice.toFixed(2)}`;
}

function WatchRow({ row, onRemove }: { row: WatchlistRow; onRemove: () => void }) {
  const { t } = useTheme();
  const changePct = row.prevClose > 0 ? ((row.lastPrice - row.prevClose) / row.prevClose) * 100 : 0;
  const color = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(changePct)];

  return (
    <Pressable
      onPress={() => router.push(`/stock/${row.ticker}` as never)}
      style={{ paddingVertical: 12 }}
    >
      <Row>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Body
            medium
            size={12}
            style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
          >
            {row.ticker}
          </Body>
          <Muted size={11} numberOfLines={1} style={{ marginTop: 2 }}>
            {row.name}
          </Muted>
        </View>
        <View style={{ alignItems: "flex-end", marginRight: 12 }}>
          <Num medium>{priceLabel(row)}</Num>
          <Num style={{ color, fontSize: 12, marginTop: 2 }}>{fmtPct(changePct)}</Num>
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Trash2 color={t.textMuted} size={16} />
        </Pressable>
      </Row>
    </Pressable>
  );
}

function AddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const add = useAddWatchlist();

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      searchTicker(q.trim())
        .then((r) => {
          if (!cancelled) setResults(r.slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);

  function pick(ticker: string) {
    add.mutate(ticker, {
      onSuccess: () => {
        haptic.success();
        setQ("");
        setResults([]);
        onClose();
      },
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Heading level={2} style={{ marginBottom: 12 }}>
        Add to watchlist
      </Heading>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Search color={t.textMuted} size={16} />
        <View style={{ flex: 1 }}>
          <TextField
            placeholder="Search ticker or name"
            autoCapitalize="characters"
            autoCorrect={false}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>
      {results.map((r, i) => (
        <View key={r.ticker}>
          <Pressable onPress={() => pick(r.ticker)} style={{ paddingVertical: 12 }}>
            <Row>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Body
                  medium
                  size={13}
                  style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
                >
                  {r.ticker}
                </Body>
                <Muted size={11} numberOfLines={1} style={{ marginTop: 2 }}>
                  {r.name}
                </Muted>
              </View>
              <Plus color={t.brandPeriwinkle} size={18} />
            </Row>
          </Pressable>
          {i < results.length - 1 ? <Hairline /> : null}
        </View>
      ))}
    </BottomSheet>
  );
}

export default function WatchlistScreen() {
  const { t } = useTheme();
  const { data: rows = [], isLoading, refetch, isRefetching } = useWatchlist();
  const remove = useRemoveWatchlist();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Row style={{ marginBottom: 16 }}>
        <Heading level={1}>Watchlist</Heading>
        <Pressable
          onPress={() => setAddOpen(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: t.primary,
          }}
        >
          <Plus color={t.onPrimary} size={16} />
          <Body medium size={13} style={{ color: t.onPrimary }}>
            Add
          </Body>
        </Pressable>
      </Row>

      {isLoading ? (
        <CardSkeleton height={200} />
      ) : !rows.length ? (
        <EmptyState
          icon="⭐"
          title="Your watchlist is empty"
          subtitle="Tap Add to track tickers you don't own yet."
        />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {rows.map((row, i) => (
            <View key={row.ticker}>
              <WatchRow
                row={row}
                onRemove={() => {
                  remove.mutate(row.ticker);
                  haptic.selection();
                }}
              />
              {i < rows.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </Card>
      )}

      <AddSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

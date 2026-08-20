import { useState, useMemo } from "react";
import { View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { compute, fmtGBP, fmtGBPSigned, fmtPct, dir } from "@stocktracker/shared";
import { usePortfolio, useAddHolding, useSellUnits, useAddLot } from "@/api/queries";
import * as endpoints from "@/api/endpoints";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num, Eyebrow } from "@/components/Typography";
import { PctText } from "@/components/PctText";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/ThemeProvider";
import type { HoldingComputed } from "@stocktracker/shared";

type TradeMode = "buy" | "sell";

function HoldingRow({ h, onTrade }: { h: HoldingComputed; onTrade: (h: HoldingComputed) => void }) {
  const { t } = useTheme();
  const color = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(h.unrealisedGL)];

  return (
    <View style={{ paddingVertical: 12 }}>
      <Pressable onPress={() => router.push(`/stock/${h.ticker}` as never)}>
        <Row>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Body
                medium
                size={12}
                style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
              >
                {h.ticker}
              </Body>
              <Muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>
                {h.name}
              </Muted>
            </View>
            <Muted size={11} style={{ marginTop: 2 }}>
              {h.units.toFixed(3)} units · cost {fmtGBP(h.costGBP)}
            </Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Num medium>{fmtGBP(h.marketValueGBP)}</Num>
            <Num style={{ color, fontSize: 12, marginTop: 2 }}>
              {fmtGBPSigned(h.unrealisedGL)} ({fmtPct(h.unrealisedPct)})
            </Num>
          </View>
        </Row>
      </Pressable>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 6 }}>
        <Pressable
          onPress={() => onTrade(h)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: t.hairline,
          }}
        >
          <Muted size={11}>Trade</Muted>
        </Pressable>
      </View>
    </View>
  );
}

function BucketSection({
  label,
  rows,
  onTrade,
}: {
  label: string;
  rows: HoldingComputed[];
  onTrade: (h: HoldingComputed) => void;
}) {
  const { t } = useTheme();
  const totalValue = rows.reduce((s, r) => s + r.marketValueGBP, 0);
  const totalGL = rows.reduce((s, r) => s + r.unrealisedGL, 0);
  const color = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(totalGL)];

  return (
    <View style={{ marginBottom: 16 }}>
      <Row style={{ marginBottom: 6 }}>
        <Eyebrow>{label}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Num style={{ fontSize: 12 }}>{fmtGBP(totalValue)}</Num>
          <Num style={{ fontSize: 12, color }}>{fmtGBPSigned(totalGL)}</Num>
        </View>
      </Row>
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        {rows.map((h, i) => (
          <View key={h.ticker}>
            <HoldingRow h={h} onTrade={onTrade} />
            {i < rows.length - 1 ? <Hairline /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function HoldingsScreen() {
  const { t } = useTheme();
  const { data: portfolio, isLoading } = usePortfolio();
  const { mutateAsync: doAddHolding, isPending: addingHolding } = useAddHolding();
  const { mutateAsync: doSellUnits, isPending: selling } = useSellUnits();
  const { mutateAsync: doAddLot, isPending: buying } = useAddLot();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [tradeTarget, setTradeTarget] = useState<HoldingComputed | null>(null);
  const [tradeMode, setTradeMode] = useState<TradeMode>("buy");

  const [addTicker, setAddTicker] = useState("");
  const [addUnits, setAddUnits] = useState("");
  const [addDate, setAddDate] = useState(TODAY);
  const [addPrice, setAddPrice] = useState("");
  const [addBucket, setAddBucket] = useState<"Fund" | "Stock">("Stock");
  const [autoFillingPrice, setAutoFillingPrice] = useState(false);

  const [tradeUnits, setTradeUnits] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeDate, setTradeDate] = useState(TODAY);

  const holdings = portfolio?.holdings ?? [];
  const cashGBP = portfolio?.cashGBP ?? 0;
  const p = useMemo(() => compute(holdings, cashGBP), [holdings, cashGBP]);
  const funds = useMemo(
    () =>
      p.rows
        .filter((h) => h.bucket === "Fund")
        .sort((a, b) => b.marketValueGBP - a.marketValueGBP),
    [p.rows],
  );
  const stocks = useMemo(
    () =>
      p.rows
        .filter((h) => h.bucket === "Stock")
        .sort((a, b) => b.marketValueGBP - a.marketValueGBP),
    [p.rows],
  );

  async function handleAutoFillPrice() {
    const ticker = addTicker.trim().toUpperCase();
    if (!ticker || !addDate) return;
    setAutoFillingPrice(true);
    try {
      const { price } = await endpoints.getPriceForDate(ticker, addDate);
      if (price > 0) setAddPrice(String(price));
    } catch {
      // no-op
    } finally {
      setAutoFillingPrice(false);
    }
  }

  async function handleAddHolding() {
    const ticker = addTicker.trim().toUpperCase();
    const units = parseFloat(addUnits);
    if (!ticker || isNaN(units) || units <= 0 || !addDate) {
      Alert.alert("Missing fields", "Ticker, units, and date are required.");
      return;
    }
    const price = parseFloat(addPrice);
    try {
      await doAddHolding({
        ticker,
        units,
        dateBought: addDate,
        price: !isNaN(price) && price > 0 ? price : undefined,
        bucket: addBucket,
        allocTarget: 0,
        deductCash: false,
      });
      setShowAddSheet(false);
      setAddTicker("");
      setAddUnits("");
      setAddDate(TODAY);
      setAddPrice("");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add holding.");
    }
  }

  async function handleTrade() {
    if (!tradeTarget) return;
    const units = parseFloat(tradeUnits);
    const price = parseFloat(tradePrice);
    if (isNaN(units) || units <= 0 || isNaN(price) || price <= 0) {
      Alert.alert("Missing fields", "Units and price are required.");
      return;
    }
    try {
      if (tradeMode === "buy") {
        await doAddLot({ ticker: tradeTarget.ticker, units, price, date: tradeDate });
      } else {
        await doSellUnits({ ticker: tradeTarget.ticker, data: { units, price } });
      }
      setTradeTarget(null);
      setTradeUnits("");
      setTradePrice("");
      setTradeDate(TODAY);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to record trade.");
    }
  }

  function openTrade(h: HoldingComputed) {
    setTradeTarget(h);
    setTradeMode("buy");
    setTradeUnits("");
    setTradePrice(String(h.lastPrice));
    setTradeDate(TODAY);
  }

  if (isLoading) {
    return (
      <Screen>
        <CardSkeleton height={200} />
        <View style={{ height: 16 }} />
        <CardSkeleton height={300} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ marginBottom: 4, alignItems: "flex-start" }}>
        <View>
          <Eyebrow>Portfolio</Eyebrow>
          <Heading level={1} style={{ marginTop: 4, marginBottom: 12 }}>
            Holdings
          </Heading>
        </View>
        <Pressable
          onPress={() => setShowAddSheet(true)}
          style={{
            backgroundColor: t.primary,
            borderRadius: 20,
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <Plus color={t.onPrimary} size={20} />
        </Pressable>
      </Row>

      <Row style={{ marginBottom: 20 }}>
        <Num medium style={{ fontSize: 28 }}>
          {fmtGBP(p.marketValue)}
        </Num>
        <PctText value={p.unrealisedPct} />
      </Row>

      {!p.rows.length ? (
        <EmptyState
          icon="📊"
          title="No holdings yet"
          subtitle="Tap + to add your first holding."
        />
      ) : (
        <>
          {funds.length > 0 && <BucketSection label="Funds" rows={funds} onTrade={openTrade} />}
          {stocks.length > 0 && (
            <BucketSection label="Stocks" rows={stocks} onTrade={openTrade} />
          )}
        </>
      )}

      {/* Add Holding Sheet */}
      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)}>
        <Body medium size={16} style={{ marginBottom: 16 }}>
          Add Holding
        </Body>
        <View style={{ gap: 12 }}>
          <TextField
            label="Ticker (e.g. VWRP)"
            value={addTicker}
            onChangeText={(v) => setAddTicker(v.toUpperCase())}
            autoCapitalize="characters"
            placeholder="AAPL"
          />
          <TextField
            label="Units"
            value={addUnits}
            onChangeText={setAddUnits}
            keyboardType="decimal-pad"
            placeholder="10"
          />
          <TextField
            label="Date bought (YYYY-MM-DD)"
            value={addDate}
            onChangeText={setAddDate}
            placeholder="2024-01-15"
          />
          <View style={{ gap: 6 }}>
            <Muted size={11}>Price (optional)</Muted>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={addPrice}
                  onChangeText={setAddPrice}
                  keyboardType="decimal-pad"
                  placeholder="Auto-fill or enter"
                />
              </View>
              <Button
                title={autoFillingPrice ? "…" : "Fill"}
                onPress={handleAutoFillPrice}
                disabled={autoFillingPrice || !addTicker || !addDate}
              />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Muted size={11}>Type</Muted>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["Stock", "Fund"] as const).map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setAddBucket(b)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: addBucket === b ? t.primary : t.hairline,
                    backgroundColor: addBucket === b ? t.primary + "18" : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Body
                    medium
                    size={13}
                    style={{ color: addBucket === b ? t.primary : t.textBody }}
                  >
                    {b}
                  </Body>
                </Pressable>
              ))}
            </View>
          </View>
          <Button
            title={addingHolding ? "Adding…" : "Add Holding"}
            onPress={handleAddHolding}
            disabled={addingHolding}
          />
        </View>
      </BottomSheet>

      {/* Buy / Sell Trade Sheet */}
      <BottomSheet visible={!!tradeTarget} onClose={() => setTradeTarget(null)}>
        {tradeTarget && (
          <>
            <Body medium size={16} style={{ marginBottom: 16 }}>
              Trade {tradeTarget.ticker}
            </Body>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["buy", "sell"] as TradeMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setTradeMode(mode)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: tradeMode === mode ? t.primary : t.hairline,
                    backgroundColor: tradeMode === mode ? t.primary + "18" : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Body
                    medium
                    size={13}
                    style={{
                      color: tradeMode === mode ? t.primary : t.textBody,
                      textTransform: "capitalize",
                    }}
                  >
                    {mode}
                  </Body>
                </Pressable>
              ))}
            </View>
            <View style={{ gap: 12 }}>
              <TextField
                label="Units"
                value={tradeUnits}
                onChangeText={setTradeUnits}
                keyboardType="decimal-pad"
                placeholder="5"
              />
              <TextField
                label="Price (p or £)"
                value={tradePrice}
                onChangeText={setTradePrice}
                keyboardType="decimal-pad"
                placeholder={String(tradeTarget.lastPrice)}
              />
              {tradeMode === "buy" && (
                <TextField
                  label="Date (YYYY-MM-DD)"
                  value={tradeDate}
                  onChangeText={setTradeDate}
                  placeholder={TODAY}
                />
              )}
              {tradeMode === "sell" && (
                <Muted size={11}>Available: {tradeTarget.units.toFixed(3)} units</Muted>
              )}
              <Button
                title={buying || selling ? "Recording…" : tradeMode === "buy" ? "Buy" : "Sell"}
                onPress={handleTrade}
                disabled={buying || selling}
              />
            </View>
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

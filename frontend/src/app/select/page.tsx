'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scenario, Character } from '@/types';
import { getScenarios } from '@/lib/api/scenarios';
import { getCharacters } from '@/lib/api/characters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Check, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'scenario' | 'character';

export default function SelectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('scenario');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // シナリオとキャラクターを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [scenarioData, characterData] = await Promise.all([
          getScenarios(),
          getCharacters({ activeOnly: true }),
        ]);
        setScenarios(scenarioData);
        setCharacters(characterData.items);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 会話開始
  const handleStart = () => {
    if (!selectedScenario || !selectedCharacter) return;

    // クエリパラメータで選択情報を渡す
    const params = new URLSearchParams({
      scenarioId: selectedScenario.id.toString(),
      characterId: selectedCharacter.id.toString(),
    });
    router.push(`/chat?${params.toString()}`);
  };

  // ステップを進める
  const handleNextStep = () => {
    if (step === 'scenario' && selectedScenario) {
      setStep('character');
    }
  };

  // ステップを戻る
  const handlePrevStep = () => {
    if (step === 'character') {
      setStep('scenario');
    }
  };

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ホームに戻る
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </Link>

          {/* ステップインジケーター */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
              step === 'scenario'
                ? "bg-accent-primary text-white"
                : selectedScenario
                  ? "bg-status-success/20 text-status-success"
                  : "bg-bg-secondary text-text-muted"
            )}>
              {selectedScenario && step !== 'scenario' ? (
                <Check className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              シナリオ
            </div>
            <ArrowRight className="h-4 w-4 text-text-muted" />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
              step === 'character'
                ? "bg-accent-primary text-white"
                : "bg-bg-secondary text-text-muted"
            )}>
              <User className="h-4 w-4" />
              キャラクター
            </div>
          </div>
        </div>

        {/* シナリオ選択 */}
        {step === 'scenario' && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              シナリオを選択
            </h1>
            <p className="text-text-secondary mb-6">
              練習したいシナリオを選んでください
            </p>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : scenarios.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                利用可能なシナリオがありません
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-accent-primary",
                      selectedScenario?.id === scenario.id && "border-accent-primary bg-accent-primary/5"
                    )}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {scenario.name}
                        {selectedScenario?.id === scenario.id && (
                          <Check className="h-5 w-5 text-accent-primary" />
                        )}
                      </CardTitle>
                      {scenario.description && (
                        <CardDescription>{scenario.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {scenario.situation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-8">
              <Button
                onClick={handleNextStep}
                disabled={!selectedScenario}
              >
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* キャラクター選択 */}
        {step === 'character' && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              キャラクターを選択
            </h1>
            <p className="text-text-secondary mb-6">
              会話する相手を選んでください
            </p>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : characters.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                利用可能なキャラクターがありません
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {characters.map((character) => (
                  <Card
                    key={character.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-accent-primary",
                      selectedCharacter?.id === character.id && "border-accent-primary bg-accent-primary/5"
                    )}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {character.name}
                        {selectedCharacter?.id === character.id && (
                          <Check className="h-5 w-5 text-accent-primary" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {character.persona}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
              <Button
                onClick={handleStart}
                disabled={!selectedCharacter}
              >
                会話を始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

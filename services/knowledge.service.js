import { supabase } from "../lib/supabase.js";

export async function getWorkspaceConnection(teamId) {
  const { data, error } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error) throw error;

  return data;
}

export async function searchKnowledge(slackConnectionId, query) {
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("slack_connection_id", slackConnectionId)
    .ilike("summary", `%${query}%`)
    .limit(10);

  if (error) throw error;

  return data ?? [];
}

export async function createSuggestion(payload) {
  const { data, error } = await supabase
    .from("knowledge_suggestions")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

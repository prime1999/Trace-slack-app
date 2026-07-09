import { supabase } from "../lib/supabase.js";

export async function getWorkspaceConnection(teamId) {
  console.log("Fetching workspace connection for teamId:", teamId);
  const { data, error } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("team_id", teamId);

  if (error) {
    console.log("Error fetching workspace connection:");
    throw error;
  }

  return data;
}

export async function searchKnowledge(slackConnectionId, query) {
  console.log(
    `Searching knowledge for slackConnectionId: ${slackConnectionId}, query: ${query}`,
  );
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("slack_connection_id", slackConnectionId)
    .ilike("summary", `%${query}%`)
    .limit(10);

  if (error) {
    console.log("Error searching knowledge:");
    throw error;
  }
  return data ?? [];
}

export async function createSuggestion(payload) {
  const { data, error } = await supabase
    .from("knowledge_suggestions")
    .insert(payload)
    .select();

  if (error) {
    console.log("Error creating suggestion:");
    throw error;
  }

  return data;
}

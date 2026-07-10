import { supabase } from "../lib/supabase.js";
import { createEmbedding } from "./gemini.service.js";

export async function getWorkspaceConnection(teamId) {
  console.log("Fetching workspace connection for teamId:", teamId);
  const { data, error } = await supabase
    .from("slack_connections")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.log("Error fetching workspace connection:");
    throw error;
  }

  console.log("Workspace connection fetched:", data);
  return data;
}

export async function searchKnowledge(slackConnectionId, query) {
  console.log(
    `Searching knowledge for slackConnectionId: ${slackConnectionId}, query: ${query}`,
  );
  // const { data, error } = await supabase
  //   .from("knowledge_entries")
  //   .select("*")
  //   .eq("slack_connection_id", slackConnectionId)
  //   .ilike("summary", `%${query}%`)
  //   .limit(10);

  const queryEmbedding = await createEmbedding(query);

  const { data, error } = await supabase.rpc("match_knowledge", {
    connection_id: slackConnectionId,
    query_embedding: queryEmbedding,
    match_count: 10,
  });

  if (error) {
    console.log("Error searching knowledge:");
    throw error;
  }

  console.log("Knowledge search results:", data);
  return data ?? [];
}

export async function createSuggestion(payload) {
  console.log("Creating suggestion with payload:", payload);
  const { data, error } = await supabase
    .from("knowledge_suggestions")
    .insert(payload)
    .select();

  if (error) {
    console.log("Error creating suggestion:");
    throw error;
  }
  console.log("Suggestion created:", data);
  return data;
}

export async function createKnowledgeEntry(data) {
  const { data: entry, error } = await supabase
    .from("knowledge_entries")
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  return entry;
}

export async function getSuggestion(id) {
  const { data, error } = await supabase
    .from("knowledge_suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function deleteSuggestion(id) {
  const { error } = await supabase
    .from("knowledge_suggestions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

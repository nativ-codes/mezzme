import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { APIRoutes } from "@/config/api/routes";

interface ProfilePicture {
  _id: string;
  url: string;
  isPrimary: boolean;
}

interface User {
  _id: string;
  authId: string;
  username: string;
  email: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  profilePictures?: ProfilePicture[];
}

const fetchUsers = async (authToken: string): Promise<User[]> => {
  const response = await fetch(APIRoutes.users.getAll, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  console.log("response", APIRoutes.users.getAll);

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  return response.json();
};

const followUser = async ({
  authToken,
  targetUserId,
}: {
  authToken: string;
  targetUserId: string;
}) => {
  const response = await fetch(APIRoutes.users.follow(targetUserId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to follow user");
  }

  return response.json();
};

const unfollowUser = async ({
  authToken,
  targetUserId,
}: {
  authToken: string;
  targetUserId: string;
}) => {
  const response = await fetch(APIRoutes.users.unfollow(targetUserId), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow user");
  }

  return response.json();
};

export default function UsersPage() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const authToken = await getToken();
      if (!authToken) throw new Error("No auth token");
      return fetchUsers(authToken);
    },
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const authToken = await getToken();
      if (!authToken) throw new Error("No auth token");
      return followUser({ authToken, targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const authToken = await getToken();
      if (!authToken) throw new Error("No auth token");
      return unfollowUser({ authToken, targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleFollowToggle = (user: User) => {
    if (user.isFollowing) {
      unfollowMutation.mutate(user._id);
    } else {
      followMutation.mutate(user._id);
    }
  };

  const renderUser = ({ item: user }: { item: User }) => {
    const isCurrentUser = user.authId === userId;
    const primaryPicture = user.profilePictures?.find(pic => pic.isPrimary);
    const otherPictures = user.profilePictures?.filter(pic => !pic.isPrimary) || [];
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userContent}>
          {/* Primary Profile Picture */}
          <View style={styles.primaryPictureContainer}>
            {primaryPicture ? (
              <Image source={{ uri: primaryPicture.url }} style={styles.primaryPicture} />
            ) : (
              <View style={styles.defaultPicture}>
                <Text style={styles.defaultPictureText}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.stats}>
                {user.followersCount} followers • {user.followingCount} following
              </Text>
            </View>

            {/* Other Profile Pictures */}
            {otherPictures.length > 0 && (
              <ScrollView 
                horizontal 
                style={styles.otherPicturesContainer}
                showsHorizontalScrollIndicator={false}
              >
                {otherPictures.map((picture, index) => (
                  <Image 
                    key={picture._id}
                    source={{ uri: picture.url }} 
                    style={styles.otherPicture} 
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Follow Button */}
          {!isCurrentUser && (
            <TouchableOpacity
              style={[
                styles.followButton,
                user.isFollowing && styles.followingButton,
              ]}
              onPress={() => handleFollowToggle(user)}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              <Text
                style={[
                  styles.followButtonText,
                  user.isFollowing && styles.followingButtonText,
                ]}
              >
                {followMutation.isPending || unfollowMutation.isPending
                  ? "..."
                  : user.isFollowing
                  ? "Following"
                  : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Error loading users: {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  userCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  primaryPictureContainer: {
    marginRight: 12,
  },
  primaryPicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0e0e0",
  },
  defaultPicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultPictureText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  otherPicturesContainer: {
    marginTop: 8,
  },
  otherPicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#e0e0e0",
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
  },
  stats: {
    fontSize: 12,
    color: "#888",
  },
  followButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignSelf: "flex-start",
  },
  followingButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  followButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#333",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    fontSize: 16,
  },
});

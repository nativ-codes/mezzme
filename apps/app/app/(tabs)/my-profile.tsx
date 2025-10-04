import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { APIRoutes } from "@/config/api/routes";

interface ProfilePicture {
  _id: string;
  url: string;
  isPrimary: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  profilePictures: ProfilePicture[];
}

const { width } = Dimensions.get("window");
const imageSize = (width - 60) / 3; // 3 images per row with padding

const fetchCurrentUser = async (authToken: string, userId: string): Promise<User> => {
  console.log("👤 Fetching current user...");
  console.log("🔑 Auth token length:", authToken?.length);
  console.log("🆔 User ID:", userId);
  console.log("🌐 Fetch URL:", APIRoutes.users.getAll);

  const response = await fetch(APIRoutes.users.getAll, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  console.log("📥 User fetch response status:", response.status);

  if (!response.ok) {
    console.log("❌ Failed to fetch users");
    throw new Error("Failed to fetch user data");
  }

  const users = await response.json();
  console.log("👥 Fetched users count:", users?.length);
  console.log("👥 All users authIds:", users?.map((u: any) => u.authId));
  
  const currentUser = users.find((user: any) => user.authId === userId);
  console.log("👤 Found current user:", !!currentUser);
  console.log("👤 Current user data:", currentUser);
  
  return currentUser || users[0];
};

const uploadProfilePicture = async (authToken: string, imageUri: string) => {
  console.log("🚀 Starting upload process...");
  console.log("📷 Image URI:", imageUri);
  console.log("🔑 Auth token length:", authToken?.length);
  console.log("🌐 Upload URL:", APIRoutes.users.profilePictures.add);

  const formData = new FormData();
  
  // Create file object for upload
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  let type = match ? `image/${match[1]}` : 'image/jpeg';
  
  // Fix common MIME type issues
  if (type === 'image/jpg') {
    type = 'image/jpeg';
  }

  console.log("📁 File details:", { filename, type });

  const fileObject = {
    uri: imageUri,
    name: filename,
    type,
  };

  console.log("📦 File object:", fileObject);

  formData.append('profilePicture', fileObject as any);

  console.log("📤 Sending request...");

  try {
    const response = await fetch(APIRoutes.users.profilePictures.add, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        // Note: Don't set Content-Type for FormData, let the browser set it
      },
      body: formData,
    });

    console.log("📥 Response status:", response.status);
    console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log("❌ Response not OK, attempting to parse error...");
      
      let errorData;
      try {
        const responseText = await response.text();
        console.log("📄 Raw response text:", responseText);
        
        try {
          errorData = JSON.parse(responseText);
          console.log("📋 Parsed error data:", errorData);
        } catch (parseError) {
          console.log("⚠️ Failed to parse response as JSON:", parseError);
          errorData = { message: responseText || `HTTP ${response.status}` };
        }
      } catch (textError) {
        console.log("⚠️ Failed to read response text:", textError);
        errorData = { message: `HTTP ${response.status}` };
      }

      throw new Error(errorData.message || "Failed to upload image");
    }

    console.log("✅ Upload successful, parsing response...");
    const result = await response.json();
    console.log("📋 Upload result:", result);
    return result;

  } catch (error) {
    console.log("💥 Upload error:", error);
    throw error;
  }
};

const removeProfilePicture = async (authToken: string, profilePictureId: string) => {
  const response = await fetch(APIRoutes.users.profilePictures.remove, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profilePictureId }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove image");
  }

  return response.json();
};

const setPrimaryProfilePicture = async (authToken: string, profilePictureId: string) => {
  const response = await fetch(APIRoutes.users.profilePictures.setPrimary, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profilePictureId }),
  });

  if (!response.ok) {
    throw new Error("Failed to set primary image");
  }

  return response.json();
};

export default function MyProfilePage() {
  const { getToken, userId } = useAuth();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      console.log("🔄 Refetching current user data...");
      const authToken = await getToken();
      if (!authToken || !userId) throw new Error("No auth token or user ID");
      const result = await fetchCurrentUser(authToken, userId);
      console.log("📊 Refetched user data:", result);
      return result;
    },
    enabled: !!clerkUser,
  });

  const uploadMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      console.log("🔄 Upload mutation started");
      const authToken = await getToken();
      console.log("🔑 Got auth token in mutation:", !!authToken);
      if (!authToken) throw new Error("No auth token");
      return uploadProfilePicture(authToken, imageUri);
    },
    onSuccess: (data) => {
      console.log("✅ Upload mutation successful:", data);
      console.log("🔄 Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      console.log("✅ Queries invalidated");
    },
    onError: (error: Error) => {
      console.log("❌ Upload mutation error:", error);
      Alert.alert("Upload Error", error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (profilePictureId: string) => {
      const authToken = await getToken();
      if (!authToken) throw new Error("No auth token");
      return removeProfilePicture(authToken, profilePictureId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      Alert.alert("Remove Error", error.message);
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (profilePictureId: string) => {
      const authToken = await getToken();
      if (!authToken) throw new Error("No auth token");
      return setPrimaryProfilePicture(authToken, profilePictureId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      Alert.alert("Set Primary Error", error.message);
    },
  });

  const pickImage = async () => {
    console.log("📸 Pick image started");
    console.log("📊 Current pictures count:", userData?.profilePictures?.length);

    if ((userData?.profilePictures?.length ?? 0) >= 5) {
      console.log("⚠️ Picture limit reached");
      Alert.alert("Limit Reached", "You can only have up to 5 profile pictures.");
      return;
    }

    console.log("🔐 Requesting media library permissions...");
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log("🔐 Permission result:", permissionResult);
    
    if (permissionResult.granted === false) {
      console.log("❌ Permission denied");
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    console.log("📱 Launching image library...");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    console.log("📱 Image picker result:", result);

    if (!result.canceled && result.assets[0]) {
      console.log("✅ Image selected:", result.assets[0].uri);
      setUploadingImage(true);
      try {
        await uploadMutation.mutateAsync(result.assets[0].uri);
      } catch (error) {
        console.log("💥 Upload failed in pickImage:", error);
      } finally {
        setUploadingImage(false);
      }
    } else {
      console.log("❌ Image selection canceled or failed");
    }
  };

  const handleRemoveImage = (profilePictureId: string) => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove this profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => removeMutation.mutate(profilePictureId)
        },
      ]
    );
  };

  const handleSetPrimary = (profilePictureId: string) => {
    const targetPicture = userData?.profilePictures?.find(pic => pic._id === profilePictureId);
    if (targetPicture?.isPrimary) return;
    setPrimaryMutation.mutate(profilePictureId);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Error loading profile: {error.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.userInfoSection}>
        <Text style={styles.username}>@{userData?.username}</Text>
        <Text style={styles.email}>{userData?.email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Pictures</Text>
          <Text style={styles.pictureCount}>
            {userData?.profilePictures?.length || 0}/5
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={pickImage}
          disabled={uploadingImage || ((userData?.profilePictures?.length ?? 0) >= 5)}
        >
          {uploadingImage ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {(userData?.profilePictures?.length ?? 0) >= 5 ? "Limit Reached" : "Add Photo"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: "#34C759", marginBottom: 10 }]} 
          onPress={() => {
            console.log("🔄 Manual refresh triggered");
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          }}
        >
          <Text style={styles.uploadButtonText}>Refresh Data</Text>
        </TouchableOpacity>

        <View style={styles.imagesGrid}>
          {userData?.profilePictures?.map((picture) => {
            console.log("🖼️ Rendering picture:", picture);
            return (
            <View key={picture._id} style={styles.imageContainer}>
              <Image source={{ uri: picture.url }} style={styles.profileImage} />
              
              {picture.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}

              <View style={styles.imageActions}>
                {!picture.isPrimary && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetPrimary(picture._id)}
                    disabled={setPrimaryMutation.isPending}
                  >
                    <Text style={styles.actionButtonText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => handleRemoveImage(picture._id)}
                  disabled={removeMutation.isPending}
                >
                  <Text style={[styles.actionButtonText, styles.removeButtonText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            );
          })}
        </View>

        {(!userData?.profilePictures || userData.profilePictures.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No profile pictures yet. Add your first photo!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: "center",
  },
  username: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  pictureCount: {
    fontSize: 14,
    color: "#666",
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageContainer: {
    width: imageSize,
    marginBottom: 16,
  },
  profileImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  primaryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#34C759",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  imageActions: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    color: "#333",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
  },
  removeButtonText: {
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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

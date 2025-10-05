import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import React, { useEffect } from "react";
import { APIRoutes } from "@/config/api/routes";
console.log("authToken", APIRoutes.auth.login);

const signInQuery = async ({
  authToken,
  userId,
}: {
  authToken: string;
  userId: string;
}) => {
  const response = await fetch(APIRoutes.auth.login, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
    method: "POST",
  });

  return response.json();
};

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken, userId } = useAuth();

  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const signOnServer = async () => {
    const authToken = await getToken();
    console.log("authToken", userId);
    if (authToken) {
      const response = await signInQuery({
        authToken,
        userId: userId as string,
      });
      console.log("response", userId, response);
      router.replace("/users");
    } else {
      throw new Error("No auth token");
    }
  };

  useEffect(() => {
    if (userId) {
      signOnServer();
    }
  }, [userId]);

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return;

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });
      console.log("signInAttempt", signInAttempt.userData);
      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === "complete" && signInAttempt.identifier) {
        await setActive({ session: signInAttempt.createdSessionId });
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        console.error(
          "signInAttempt else",
          JSON.stringify(signInAttempt, null, 2)
        );
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error("signInAttempt catch", JSON.stringify(err, null, 2));
    }
  };

  return (
    <View>
      <Text>Sign in</Text>
      <TextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
      />
      <TextInput
        autoCapitalize="none"
        value={username}
        placeholder="Enter username"
        onChangeText={(username) => setUsername(username)}
      />
      <TextInput
        value={password}
        placeholder="Enter password"
        secureTextEntry={true}
        onChangeText={(password) => setPassword(password)}
      />
      <TouchableOpacity onPress={onSignInPress}>
        <Text>Continue</Text>
      </TouchableOpacity>
      <View style={{ display: "flex", flexDirection: "row", gap: 3 }}>
        <Text>Don't have an account?</Text>
        <Link href="/sign-up">
          <Text>Sign up</Text>
        </Link>
      </View>
    </View>
  );
}

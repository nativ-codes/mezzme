import * as React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { APIRoutes } from "@/config/api/routes";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { getToken } = useAuth();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const createUserQuery = async ({
    authToken,
    username,
    email,
  }: {
    authToken: string;
    username: string;
    email: string;
  }) => {
    const response = await fetch(APIRoutes.users.create, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email }),
      method: "POST",
    });

    return response.json();
  };

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    // Start sign-up process using email and password provided
    try {
      const signUpAttempt = await signUp.create({
        emailAddress,
        username,
        password,
      });

      console.log(signUpAttempt)


      await setActive({ session: signUpAttempt.createdSessionId });

      const authToken = await getToken();
      console.log('>>', authToken);

      // Create user record on backend
      if (authToken && username && emailAddress) {
        try {
          const userResponse = await createUserQuery({
            authToken,
            username,
            email: emailAddress,
          });
          console.log('User created:', userResponse);
        } catch (error) {
          console.error('Failed to create user:', error);
        }
      }

      // Redirect to users page
      router.replace("/users");

      // Send user an email with verification code
      // await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      // setPendingVerification(true);
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };


  return (
    <View>
      <>
        <Text>Sign up</Text>
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Enter email"
          onChangeText={(email) => setEmailAddress(email)}
        />
        <TextInput
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
        <TouchableOpacity onPress={onSignUpPress}>
          <Text>Continue</Text>
        </TouchableOpacity>
        <View style={{ display: "flex", flexDirection: "row", gap: 3 }}>
          <Text>Already have an account?</Text>
          <Link href="/sign-in">
            <Text>Sign in</Text>
          </Link>
        </View>
      </>
    </View>
  );
}

package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"berty.tech/weshnet"
	"berty.tech/weshnet/pkg/protocoltypes"
	"github.com/gogo/protobuf/proto"
	"github.com/mr-tron/base58"
)

var client weshnet.ServiceClient

// var group *protocoltypes.MultiMemberGroupCreate_Reply

var group *protocoltypes.Group

func main() {

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create a scanner to read input from stdin.
	scanner := bufio.NewScanner(os.Stdin)

	// Loop until the user enters "exit".
	for {
		// Print a prompt to the user.
		fmt.Print("> ")

		// Read a line of input from the user.
		if !scanner.Scan() {
			// Exit the loop if there was an error reading input.
			break
		}
		input := scanner.Text()

		// Split the input into a command and its arguments.
		parts := strings.Split(input, " ")
		if len(parts) == 0 {
			// If the user didn't enter anything, prompt again.
			continue
		}

		// Execute the command.
		switch parts[0] {
		case "init":
			if len(parts) != 2 {
				fmt.Println("Usage: init <name>")
				continue
			}
			id := parts[1]
			client1, err := weshnet.NewPersistentServiceClient("data" + id)
			if err != nil {
				panic(err)
			}
			client = client1
			defer client1.Close()
			// Exit the loop if the user entered "exit".
			continue
		case "createGroup":
			group1, err := client.MultiMemberGroupCreate(ctx, &protocoltypes.MultiMemberGroupCreate_Request{})
			if err != nil {
				panic(err)
			}

			grp, err := client.GroupInfo(ctx, &protocoltypes.GroupInfo_Request{
				GroupPK: group1.GetGroupPK(),
			})
			if err != nil {
				println(err)
				continue
			}
			group = grp.GetGroup()

			_, err = client.ActivateGroup(ctx, &protocoltypes.ActivateGroup_Request{
				GroupPK: group.PublicKey,
			})
			if err != nil {
				panic(err)
			}

			groupEncoded := base58.Encode(group.PublicKey)
			fmt.Println("Group public key: ", groupEncoded)
			continue
		case "invite":
			if group == nil {
				fmt.Println("create group first")
				continue
			}

			marchaled, err := proto.Marshal(group)
			if err != nil {
				panic(err)
			}
			fmt.Println(marchaled)
			invitationEncoded := base58.Encode(marchaled)
			fmt.Println(invitationEncoded)
			continue
		case "activateGroup":
			if len(parts) != 2 {
				fmt.Println("Usage: activateGroup <name>")
				continue
			}
			groupBase58 := parts[1]
			groupPKBytes, err := base58.Decode(groupBase58)
			if err != nil {
				fmt.Println(err)
				continue
			}
			fmt.Println(groupPKBytes)
			_, err = client.ActivateGroup(ctx, &protocoltypes.ActivateGroup_Request{
				GroupPK: groupPKBytes,
			})
			if err != nil {
				fmt.Println(err)
			}

			grp, err := client.GroupInfo(ctx, &protocoltypes.GroupInfo_Request{
				GroupPK: groupPKBytes,
			})
			if err != nil {
				println(err)
				continue
			}

			group = grp.GetGroup()
			continue
		case "joinGroup":
			if len(parts) != 2 {
				fmt.Println("Usage: init <name>")
				continue
			}

			groupBase58 := parts[1]
			groupBytes, err := base58.Decode(groupBase58)
			if err != nil {
				fmt.Println(err)
				continue
			}
			fmt.Println(groupBytes)

			group = &protocoltypes.Group{}

			err = proto.Unmarshal(groupBytes, group)
			if err != nil {
				fmt.Println(err)
				continue
			}
			fmt.Println(group)

			joinRequest := &protocoltypes.MultiMemberGroupJoin_Request{
				Group: group,
			}
			invitation, err := client.MultiMemberGroupJoin(ctx, joinRequest)
			if err != nil {
				fmt.Println(err)
				continue
			}
			fmt.Println(invitation)

			_, err = client.ActivateGroup(ctx, &protocoltypes.ActivateGroup_Request{
				GroupPK: group.PublicKey,
			})
			if err != nil {
				fmt.Println(err)
				continue
			}

			continue

		case "sendMessage":
			if len(parts) != 2 {
				fmt.Println("Usage: sendMessage <name>")
				continue
			}
			if group == nil {
				fmt.Println("create or join group first")
				continue
			}

			message := parts[1]

			_, err := client.AppMessageSend(ctx, &protocoltypes.AppMessageSend_Request{
				GroupPK: group.PublicKey,
				Payload: []byte(message),
			})
			if err != nil {
				fmt.Println(err)
				continue
			}
			println("message sent")
			continue
		case "receiveMessage":
			subMessages, err := client.GroupMessageList(ctx, &protocoltypes.GroupMessageList_Request{
				GroupPK: group.PublicKey,
			})
			if err != nil {
				fmt.Println(err)
				continue
			}

			// client waits to receive the message.
			message, err := subMessages.Recv()
			if err == io.EOF {
				fmt.Println("EOF")
				continue
			}
			if err != nil {
				fmt.Println(err)
				continue
			}

			println("received message")
			println(string(message.Message))
		case "exit":
			// Exit the loop if the user entered "exit".
			return
		default:
			fmt.Printf("Unknown command: %s\n", parts[0])
			continue
		}
	}
}

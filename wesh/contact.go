package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"berty.tech/weshnet"
	"berty.tech/weshnet/pkg/protocoltypes"
	"github.com/mr-tron/base58"
)

func main() {
	if len(os.Args) == 2 {
		doClient2(os.Args[1])
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client1, err := weshnet.NewPersistentServiceClient("data1")
	if err != nil {
		panic(err)
	}
	defer client1.Close()

	// client1 shares contact with client2.
	binaryContact, err := client1.ShareContact(ctx,
		&protocoltypes.ShareContact_Request{})
	if err != nil {
		panic(err)
	}
	fmt.Println(base58.Encode(binaryContact.EncodedContact))

	// client1 receives the contact request from client2.
	request, err := receiveContactRequest(ctx, client1)
	if err != nil {
		panic(err)
	}
	if request == nil {
		fmt.Println("Error: Did not receive the contact request")
		return
	}

	// client1 accepts the contact request from client2.
	_, err = client1.ContactRequestAccept(ctx,
		&protocoltypes.ContactRequestAccept_Request{
			ContactPK: request.ContactPK,
		})
	if err != nil {
		panic(err)
	}

	// Activate the contact group.
	groupInfo, err := client1.GroupInfo(ctx, &protocoltypes.GroupInfo_Request{
		ContactPK: request.ContactPK,
	})
	if err != nil {
		panic(err)
	}
	_, err = client1.ActivateGroup(ctx, &protocoltypes.ActivateGroup_Request{
		GroupPK: groupInfo.Group.PublicKey,
	})
	if err != nil {
		panic(err)
	}

	// Receive a message from the group.
	message, err := receiveMessage(ctx, client1, groupInfo)
	if err != nil {
		panic(err)
	}
	if message == nil {
		fmt.Print("End of stream without receiving message")
		return
	}

	fmt.Println("client2:", string(message.Message))
}

func receiveContactRequest(ctx context.Context, client weshnet.ServiceClient) (*protocoltypes.AccountContactRequestIncomingReceived, error) {
	// Get the client's AccountGroupPK from the configuration.
	config, err := client.ServiceGetConfiguration(ctx, &protocoltypes.ServiceGetConfiguration_Request{})
	if err != nil {
		return nil, err
	}

	// Subscribe to metadata events. ("sub" means "subscription".)
	subCtx, subCancel := context.WithCancel(ctx)
	defer subCancel()
	subMetadata, err := client.GroupMetadataList(subCtx, &protocoltypes.GroupMetadataList_Request{
		GroupPK: config.AccountGroupPK,
	})
	if err != nil {
		return nil, err
	}

	for {
		metadata, err := subMetadata.Recv()
		if err == io.EOF || subMetadata.Context().Err() != nil {
			// Not received.
			return nil, nil
		}
		if err != nil {
			return nil, err
		}

		if metadata == nil || metadata.Metadata.EventType !=
			protocoltypes.EventTypeAccountContactRequestIncomingReceived {
			continue
		}

		request := &protocoltypes.AccountContactRequestIncomingReceived{}
		if err = request.Unmarshal(metadata.Event); err != nil {
			return nil, err
		}

		return request, nil
	}
}

func receiveMessage(ctx context.Context, client weshnet.ServiceClient, groupInfo *protocoltypes.GroupInfo_Reply) (*protocoltypes.GroupMessageEvent, error) {
	// Subscribe to message events.
	subCtx, subCancel := context.WithCancel(ctx)
	defer subCancel()
	subMessages, err := client.GroupMessageList(subCtx, &protocoltypes.GroupMessageList_Request{
		GroupPK: groupInfo.Group.PublicKey,
	})
	if err != nil {
		panic(err)
	}

	// client waits to receive the message.
	for {
		message, err := subMessages.Recv()
		if err == io.EOF {
			// Not received.
			return nil, nil
		}
		if err != nil {
			return nil, err
		}

		return message, nil
	}
}

func doClient2(encodedContact string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client2, err := weshnet.NewPersistentServiceClient("data2")
	if err != nil {
		panic(err)
	}
	defer client2.Close()

	contactBinary, err := base58.Decode(encodedContact)
	if err != nil {
		panic(err)
	}
	contact, err := client2.DecodeContact(ctx,
		&protocoltypes.DecodeContact_Request{
			EncodedContact: contactBinary,
		})
	if err != nil {
		panic(err)
	}

	// Send the contact request.
	_, err = client2.ContactRequestSend(ctx,
		&protocoltypes.ContactRequestSend_Request{
			Contact: contact.Contact,
		})
	if err != nil {
		panic(err)
	}

	// Activate the contact group.
	groupInfo, err := client2.GroupInfo(ctx, &protocoltypes.GroupInfo_Request{
		ContactPK: contact.Contact.PK,
	})
	if err != nil {
		panic(err)
	}
	_, err = client2.ActivateGroup(ctx, &protocoltypes.ActivateGroup_Request{
		GroupPK: groupInfo.Group.PublicKey,
	})
	if err != nil {
		panic(err)
	}

	// Send a message to the contact group.
	_, err = client2.AppMessageSend(ctx, &protocoltypes.AppMessageSend_Request{
		GroupPK: groupInfo.Group.PublicKey,
		Payload: []byte("Hello"),
	})
	if err != nil {
		panic(err)
	}

	fmt.Println("Sending message...")
	time.Sleep(time.Second * 5)
}

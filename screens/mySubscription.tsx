import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import firebase from '../database/firebase';

const image = require("../images/sub.jpg");

export default class MySubscription extends Component {
  db: firebase.firestore.Firestore;

  constructor() {
    super();

    this.state = {
      expiry_date: [],
      status: [],
      remaining_chat: [],
      package_name: [],
      isLoading: false
    };

    this.db = firebase.firestore();
  }

  UNSAFE_componentWillMount() {
    this.checkForSubscription();
  }

  checkForSubscription() {
    let data = null;
    let subscription = {
      expiry_date: [],
      status: [],
      remaining_chat: [],
      package_name: []
    };

    this.setState({
      isLoading: true
    });

    this.db.collection("subscription_list")
      .doc(this.props.route.params.user.mobile)
      .collection('list')
      .get()
      .then((querySnapshot) => {
        this.setState({
          isLoading: false
        });

        if (querySnapshot.size) {
          querySnapshot.forEach(doc => {
            data = doc.data();
            subscription.status.push(data.status);
            subscription.expiry_date.push(data.expiry_date);
            subscription.remaining_chat.push(data.remaining_chat);
            subscription.package_name.push(data.package_name);
          });
          this.setState(subscription);
        } else {
          this.setState({
            status: null
          });
        }
      })
      .catch(error => {
        console.log('Error = ', error);
      });
  }

  addPackage() {
    this.props.navigation.navigate('HomeComp',
      {
        screen: 'Subscription',
        params: {
          user: this.props.route.params.user
        }
      }
    );
  }

  formatDate(date: string) {
    return new Date(date).toDateString().slice(4);
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.preloader}>
          <ActivityIndicator size="large" color="#9E9E9E" />
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <ImageBackground source={image} style={styles.image}>
          <View style={styles.itemContainer}>
            {this.state.status &&
              <View style={{ marginBottom: 30 }}>
                <View style={styles.item}>
                  <Text style={styles.lable}>Package Name</Text>
                  <Text style={styles.itemValue}>{this.state.package_name.join(', ')}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.lable}>Status</Text>
                  <Text style={styles.itemValue}>{this.state.status.join(', ')}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.lable}>Remaining Chats</Text>
                  <Text style={styles.itemValue}>{this.state.remaining_chat.join(', ')}</Text>
                </View>

                {this.state.expiry_date.length > 0 &&
                  <View style={styles.item}>
                    <Text style={styles.lable}>Expiry Date</Text>
                    <View style={{ flexShrink: 1 }}>
                      {this.state.expiry_date.map((item, index) => {
                        if (item !== '') {
                          return <Text style={[styles.itemValue, { flexShrink: 0 }]} key={index}>
                            {this.formatDate(item)}
                          </Text>
                        } else {
                          return <Text style={[styles.itemValue, { textTransform: 'uppercase' }]}
                            key={index}>
                            NIL
                      </Text>
                        }
                      })
                      }
                    </View>
                  </View>
                }
              </View>
            }

            {!this.state.status &&
              <View style={{ backgroundColor: '#fff', marginBottom: 30, padding: 20 }}>
                <Text style={{ fontSize: 24, textAlign: 'center', color: '#000' }}>
                  You don't have any current subscription yet. Please add to enjoy chatting.
                   </Text>
              </View>
            }

            <Button
              color="#3740FE"
              title="Add Subscription"
              onPress={() => this.addPackage()}
            />
          </View>
        </ImageBackground>
      </View >
    );
  }
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    justifyContent: "center"
  },
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  itemContainer: {
    marginHorizontal: 20
  },
  lable: {
    fontSize: 20,
    color: '#000',
    width: 100,
    lineHeight: 30,
  },
  itemValue: {
    fontSize: 24,
    color: 'blue',
    marginLeft: 30,
    textTransform: 'capitalize',
    flexShrink: 1
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomColor: '#dcdcdc',
    borderBottomWidth: 1,
    alignItems: "center"
  },
  preloader: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  }
});
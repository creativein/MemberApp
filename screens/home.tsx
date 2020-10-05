import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import firebase from '../database/firebase';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-community/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import FilterModal from './homeFilterModal';

const image = require("../images/bkg_home.png");
const boyImg = require("../images/boy.jpg");
const girlImg = require("../images/girl.jpg");

let unreadMsgObj = {};
let eventAttached = false;
let loggedInUserMobile: string | null | undefined = null;

let chatListResult: firebase.firestore.DocumentData[] = [];
let connectList: firebase.firestore.DocumentData[] = [];
let filterObj = {
  age1822: false,
  age2330: false,
  age3140: false,
  age40: false,
  male: false,
  female: false,
  all: false
};

export default class Home extends Component {
  memberArray: Array<Object> = [];
  db: firebase.firestore.Firestore;
  _unsubscribe: any = () => { };
  subscriptionResult = {
    expiry: [],
    count: [],
    id: []
  };

  constructor(props: Readonly<{}>) {
    super(props);

    this.state = {
      isLoading: false,
      memberList: [],
      memberDetails: {},
      showFilterModal: false
    };

    this.db = firebase.firestore();
  }

  UNSAFE_componentWillReceiveProps() {
    this.getMemberList();
    this.updateSubscriptionList();
  }

  getMemberList() {
    this.setState({
      isLoading: true
    });

    this.db
      .collection("member_list")
      .orderBy('agentId')
      .get().then((querySnapshot) => {
        this.setState({
          isLoading: false
        });

        let docData;

        // Reset data
        this.memberArray = [];
        this.setState({ memberList: [] });

        querySnapshot.forEach((doc) => {
          docData = doc.data();

          if ((!loggedInUserMobile || docData.mobile !== loggedInUserMobile)
            && docData.name) {
            docData.count = 0;
            this.memberArray.push(docData);
          }
        });

        this.setState({ memberList: [...this.memberArray] });

        this.showUnreadCount();
      })
      .catch(error => {
        this.setState({
          isLoading: false
        });
        console.log('List error = ', error);
      });
  }


  async isLoggedIn() {
    loggedInUserMobile = await AsyncStorage.getItem('loggedInMobile');

    if (!eventAttached && loggedInUserMobile) {
      this.attachUnreadCountEvent(loggedInUserMobile);
    }
  }

  async UNSAFE_componentWillMount() {
    await this.isLoggedIn();

    if (loggedInUserMobile !== null) {
      this.props.navigation.navigate('HomeComp',
        {
          screen: 'Login',
          params: {
            mobile: loggedInUserMobile
          }
        });
    } else {
      this.getMemberList();
    }

    this._unsubscribe = this.props.navigation.addListener('focus', async () => {
      await this.isLoggedIn();

      if (loggedInUserMobile !== null) {
        this.props.navigation.setOptions({
          headerRight: () => {
            return <TouchableOpacity onPress={() => this.openFilter()}>
              <FontAwesome name="filter" size={24} color="white" style={{ marginRight: 25 }} />
            </TouchableOpacity>;
          }
        });

        this.checkForSubscription();
        this.getChatConnect();
      }
    });
  }

  attachUnreadCountEvent(user: string) {
    eventAttached = true;

    firebase
      .database()
      .ref('recents')
      .child(user)
      .on('value', (value) => {
        unreadMsgObj = {};
        const val = value.val();

        for (let i in val) {
          if (val[i].unread) {
            if (unreadMsgObj[i]) {
              unreadMsgObj[i]['count'] = val[i].unread.length;
            } else {
              unreadMsgObj[i] = {
                count: val[i].unread.length
              }
            }
          }

          if (val[i].time) {
            if (unreadMsgObj[i]) {
              unreadMsgObj[i]['time'] = val[i].time;
            } else {
              unreadMsgObj[i] = {
                time: val[i].time
              }
            }
          }
        }

        this.sortUnread();

        this.showUnreadCount();
      });
  }

  showUnreadCount() {
    let mobile;
    let memberListArr = [...this.state.memberList];

    for (let i = 0; i < memberListArr.length; i++) {
      mobile = memberListArr[i].mobile;
      if (unreadMsgObj[mobile]) {
        memberListArr[i].count = unreadMsgObj[mobile].count;
      } else {
        memberListArr[i].count = 0;
      }
    }

    this.setState({ memberList: memberListArr });
  }

  componentWillUnmount() {
    this._unsubscribe();

    firebase
      .database()
      .ref('recents')
      .child(loggedInUserMobile)
      .off('value');
  }

  openFilter() {
    this.setState({ showFilterModal: true });
  }

  getChatConnect() {
    this.db.collection("chat_connect")
      .doc(loggedInUserMobile)
      .collection('chats')
      .get()
      .then((querySnapshot) => {
        let chatListData: firebase.firestore.DocumentData[] = [];
        let connectListData: firebase.firestore.DocumentData[] = [];

        querySnapshot.forEach(doc => {
          chatListData.push(doc.data().mobile);
          connectListData.push(doc.data());
        });

        chatListResult = chatListData;
        connectList = connectListData;

        this.sortUnread();
      })
      .catch(error => {
        console.log('Error = ', error);
      });
  }

  sortUnread() {
    if (!Object.keys(unreadMsgObj).length) return;
    if (!chatListResult.length) return;

    chatListResult.sort((mobile1, mobile2) => {
      if (unreadMsgObj[mobile1] && unreadMsgObj[mobile2]) {
        return unreadMsgObj[mobile2].time - unreadMsgObj[mobile1].time;
      }
      if (unreadMsgObj[mobile1]) {
        return -1;
      }
      if (unreadMsgObj[mobile2]) {
        return 1;
      }

      return null;
    });

    let member1Index, member2Index;
    this.state.memberList.sort((member1, member2) => {
      member1Index = chatListResult.indexOf(member1.mobile);
      member2Index = chatListResult.indexOf(member2.mobile);

      return (member1Index > -1 ? member1Index : Infinity)
        - (member2Index > -1 ? member2Index : Infinity);
    });
  }

  onMemberClick(item: { mobile: firebase.firestore.DocumentData; }) {
    // For not registered user
    if (!loggedInUserMobile) {
      this.props.navigation.navigate('HomeComp',
        {
          screen: 'Register',
          params: {
            verified: false
          }
        }
      )
      return;
    }

    this.verifyOnMemberClick(item);
  }

  showSubscriptionError(msg: string) {
    Alert.alert('', msg,
      [
        {
          text: 'OK',
          onPress: () =>
            this.props.navigation.navigate('HomeComp',
              {
                screen: 'Subscription',
                params: {
                  user: this.props.route.params.user
                }
              }
            )
        },
        {
          text: 'Cancel'
        }
      ]);
  }

  checkForSubscription() {
    this.subscriptionResult = {
      expiry: [],
      count: [],
      id: []
    };

    let data = null;
    this.db.collection("subscription_list")
      .doc(loggedInUserMobile)
      .collection('list')
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          data = doc.data();
          this.subscriptionResult.expiry.push(data.expiry_date);
          this.subscriptionResult.count.push(data.remaining_chat);
          this.subscriptionResult.id.push(data.id);
        });
      })
      .catch(error => {
        console.log('Error = ', error);
      });
  }

  updateSubscriptionList() {
    const today = new Date().getTime();
    let data = null;
    let expiryDate;
    let expiredPackage: any[] = [];
    const db = this.db.collection("subscription_list")
      .doc(loggedInUserMobile)
      .collection('list');

    db.get()
      .then(querySnapshot => {
        const packageLen = querySnapshot.size;

        // Keep atleast 1 package
        if (packageLen < 2) return;

        querySnapshot.forEach(doc => {
          data = doc.data();
          expiryDate = new Date(data.expiry_date).getTime();

          if (today > expiryDate) {
            expiredPackage.push(data.id);
          }
        });

        for (let i = 0; i < (packageLen - 1); i++) {
          if (i < expiredPackage.length) {
            db.doc(expiredPackage[i]).delete();
          }
        }

        this.checkForSubscription();
      })
      .catch(error => {
        console.log('Error = ', error);
      });
  }

  navigateToChat(screen: string, from: any,
    user: { mobile: firebase.firestore.DocumentData; }, subscribedData) {
    this.props.navigation.navigate('HomeComp',
      {
        screen,
        params: {
          from,
          user,
          subscribedData
        }
      });
  }

  verifyOnMemberClick(clickedMember: { mobile: firebase.firestore.DocumentData; }) {
    // Free 1 member chat
    if (!connectList.length) {
      this.navigateToChat('Chat', this.props.route.params.user, clickedMember, {
        isLifeTime: true
      });
      return;
    }

    let count = 0;
    const today = new Date().getTime();

    const chatConnect = connectList.find(chat => {
      return chat.mobile === clickedMember.mobile;
    });

    const subscribedIndex = this.subscriptionResult.expiry.findIndex((date, index) => {
      let expiryDate = new Date(this.subscriptionResult.expiry[index]).getTime();
      return date !== '' && this.subscriptionResult.count[index] && (today <= expiryDate);
    });

    this.subscriptionResult.count.map((remaining, index) => {
      if (this.subscriptionResult.expiry[index] !== '') {
        count += remaining;
      }
    });

    // For old valid chats
    if (chatConnect) {
      const expiryDate = new Date(chatConnect.expiry).getTime();

      if (today <= expiryDate) {
        this.navigateToChat('Chat', this.props.route.params.user, clickedMember, chatConnect);
      } else if (subscribedIndex > -1) {
        this.navigateToChat('Chat', this.props.route.params.user, clickedMember, {
          expiry: this.subscriptionResult.expiry[subscribedIndex],
          id: this.subscriptionResult.id[subscribedIndex],
          isUpdate: true
        });
      } else if (this.subscriptionResult.expiry.includes('')) {
        Alert.alert('', 'Your subscription request is under pending state and you will be notified once its approved. Thank you!');
      } else if (!count) {
        this.showSubscriptionError('Your chat limit has exhausted, please re-subscribe again.');
      } else if (subscribedIndex === -1) {
        this.showSubscriptionError('Your subscription has been expired, please re-subscribe again.');
      }
      return;
    }

    // New Chat
    if (subscribedIndex > -1) {
      this.navigateToChat('Chat', this.props.route.params.user, clickedMember, {
        expiry: this.subscriptionResult.expiry[subscribedIndex],
        id: this.subscriptionResult.id[subscribedIndex]
      });
      return;
    }

    if (subscribedIndex === -1 && this.subscriptionResult.expiry.includes('')) {
      Alert.alert('', 'Your subscription request is under pending state and you will be notified once its approved. Thank you!');
      return;
    }

    if (subscribedIndex === -1) {
      this.showSubscriptionError('Your subscription has been expired, please re-subscribe again.');
      return;
    }

    if (!count) {
      this.showSubscriptionError('Your chat limit has exhausted, please re-subscribe again.');
    }
  }

  getAge(dob: number) {
    return Math.floor((new Date().getTime() - dob) / 3.15576e+10);
  }

  onFilterSelect = (data: { age1822: any; age2330: any; age3140: any; age40: any; all: any; male: any; female: any; }) => {
    this.setState({ showFilterModal: false });

    if (data.isClear) {
      this.getMemberList();
    } else if (data.search) {
      this.getFilteredList(data);
    }

    if (!data.close) {
      filterObj = { ...data };
    }
  }

  getTimeFromYear(year: number) {
    const dateNow = new Date();
    return new Date(dateNow.getFullYear() - year, dateNow.getMonth(), dateNow.getDate()).getTime();
  }

  getFilteredData(query: firebase.firestore.Query<firebase.firestore.DocumentData>,
    stopLoading?: boolean) {
    return query
      .orderBy('dob', 'desc')
      .orderBy('agentId')
      .get().then(querySnapshot => {
        let docData;

        querySnapshot.forEach((doc) => {
          docData = doc.data();

          if (docData.mobile !== loggedInUserMobile) {
            docData.count = 0;
            this.memberArray.push(docData);
          }
        });

        if (stopLoading) {
          this.setState({
            memberList: [...this.memberArray],
            isLoading: false
          });
        }
        else {
          this.setState({ memberList: [...this.memberArray] });
        }
      })
      .catch((error) => {
        this.setState({
          isLoading: false
        });
        console.log('List error = ', error);
      });
  }

  getFilteredList(filterObj: { age1822: any; age2330: any; age3140: any; age40: any; all: any; male: any; female: any; }) {
    let query = this.db.collection("member_list");
    let start, end;
    let promiseArr = [], type: string | any[] = [];

    this.memberArray = [];

    // Reset data
    this.setState({ memberList: [], isLoading: true });

    if (filterObj.age1822) {
      start = this.getTimeFromYear(18);
      end = this.getTimeFromYear(22);
      const age1822 = this.getFilteredData(query.where('dob', '>=', end).where('dob', '<=', start));
      promiseArr.push(age1822);
    }

    if (filterObj.age2330) {
      start = this.getTimeFromYear(23);
      end = this.getTimeFromYear(30);
      const age2330 = this.getFilteredData(query.where('dob', '>=', end).where('dob', '<=', start));
      promiseArr.push(age2330);
    }

    if (filterObj.age3140) {
      start = this.getTimeFromYear(31);
      end = this.getTimeFromYear(40);
      const age3140 = this.getFilteredData(query.where('dob', '>=', end).where('dob', '<=', start));
      promiseArr.push(age3140);
    }

    if (filterObj.age40) {
      start = this.getTimeFromYear(41);
      end = this.getTimeFromYear(90);
      const age40 = this.getFilteredData(query.where('dob', '>=', end).where('dob', '<=', start));
      promiseArr.push(age40);
    }

    if (filterObj.male) {
      type.push('male');
    } else if (filterObj.female) {
      type.push('female');
    } else if (filterObj.all) {
      type = ['male', 'female'];
    }

    if (!promiseArr.length && type.length) {
      this.getFilteredData(query.where('gender', 'in', type), true);
      return;
    } else if (type.length) {
      Promise.all(promiseArr).then(_ => {
        if (this.state.memberList.length) {
          this.combinedOfflineFilter(type);
        } else {
          this.getFilteredData(query.where('gender', 'in', type), true);
        }
      });
      return;
    }

    if (promiseArr.length) {
      Promise.all(promiseArr).then(_ => {
        this.setState({
          isLoading: false
        });
      });
    }
  }

  combinedOfflineFilter(type: string | any[]) {
    let arr = [...this.state.memberList];

    arr = arr.filter(obj => {
      return type.indexOf(obj.gender) > -1;
    });

    this.setState({
      memberList: [...arr],
      isLoading: false
    });
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
          <View style={styles.overlay}>
            {this.state.showFilterModal === true &&
              <FilterModal show={filterObj} onFilterSelect={this.onFilterSelect}></FilterModal>
            }
            {this.state.memberList.length > 0 &&
              <FlatList
                contentContainerStyle={styles.listContainer}
                data={this.state.memberList}
                extraData={this.state.memberList}
                keyExtractor={(index) => index.mobile}
                renderItem={({ item }) =>
                  <TouchableOpacity style={styles.item}
                    onPress={() => this.onMemberClick(item)} >
                    <View style={styles.listItemWrapper}>
                      <View style={styles.listItem}>
                        <Image source={(item.image && item.image !== '') ?
                          { uri: item.image } : (item.gender === 'male' ? boyImg : girlImg)}
                          style={styles.profileImg} />
                        <View style={{ paddingLeft: 20 }}>
                          <Text style={styles.nameText}>
                            {item.name}
                          </Text>
                          <View style={styles.listDesc}>
                            <Text style={{ textTransform: 'capitalize', color: '#000' }}>
                              City: {item.city}
                            </Text>
                            {item.dob != null && typeof (item.dob) === 'number' &&
                              <View style={{ flexDirection: 'row' }}>
                                <Text>,</Text>
                                <Text style={{ paddingHorizontal: 5, color: '#000' }}>
                                  Age: {this.getAge(item.dob)}
                                </Text>
                              </View>
                            }
                          </View>
                        </View>
                      </View>
                      {item.count > 0 &&
                        <View>
                          <Text style={styles.unreadCount} >{item.count}</Text>
                        </View>
                      }
                      <View>
                        <AntDesign name="right" size={24} color="#dcdcdc" />
                      </View>
                    </View>
                  </TouchableOpacity>}
              />
            }
            {!this.state.memberList.length &&
              <Text style={styles.noMember}>No member found.</Text>
            }
          </View>
        </ImageBackground>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex"
  },
  overlay: {
    backgroundColor: 'rgba(199,199,199,0.3)',
    height: '100%',
    flexDirection: "column",
    justifyContent: "center",
    flex: 1
  },
  listContainer: {
    width: '100%',
    paddingTop: 20,
    paddingLeft: 15,
    paddingRight: 10
  },
  unreadCount: {
    backgroundColor: '#de5656',
    borderRadius: 24,
    width: 24,
    height: 24,
    lineHeight: 24,
    fontSize: 12,
    textAlign: 'center',
    color: '#fff'
  },
  image: {
    flex: 1,
    justifyContent: "center",
    zIndex: 10
  },
  profileImg: {
    width: 50,
    height: 50,
    borderRadius: 30,
    marginLeft: -38,
    top: 12,
    position: 'absolute'
  },
  item: {
    paddingHorizontal: 10,
    borderColor: '#868181',
    marginBottom: 15
  },
  listItemWrapper: {
    display: 'flex',
    paddingLeft: 15,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  listItem: {
    display: 'flex',
    paddingVertical: 5,
    marginBottom: 6,
    flex: 1,
    justifyContent: 'center'
  },
  listDesc: {
    flexDirection: 'row',
    paddingVertical: 5
  },
  nameText: {
    textTransform: 'capitalize',
    lineHeight: 30,
    color: 'green',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'serif'
  },
  editProfileBtn: {
    color: '#ffff',
    marginRight: 10,
    paddingHorizontal: 8,
    paddingVertical: 5
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
  },
  noMember: {
    fontSize: 26,
    color: '#000',
    margin: 30,
    textAlign: 'center'
  }
});
